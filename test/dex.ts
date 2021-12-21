import { ethers } from "hardhat"
import { expect } from "chai"

describe("DEX", () => {
    let owner: any, addr1: any, addrs: any
    let iao: any
    let dex: any

    beforeEach(async () => {
        ;[owner, addr1, ...addrs] = await ethers.getSigners()

        const IaoFactory = await ethers.getContractFactory("IaoToken")
        iao = await IaoFactory.deploy()
        await iao.deployed()

        const DexFactory = await ethers.getContractFactory("DEX")
        dex = await DexFactory.deploy(iao.address)
        await dex.deployed()

        await iao
            .connect(owner)
            .transfer(owner.address, addr1.address, 10 * 10 ** 18)
        await iao
            .connect(owner)
            .approve(dex.address, ethers.utils.parseEther("100"))

        await dex
            .connect(owner)
            .init(ethers.utils.parseEther("5"), {
                value: ethers.utils.parseEther("5"),
            })
    })

    describe("deposit()", () => {
        it("happy path", async () => {
            const amount = ethers.utils.parseEther("0.5")
            const tx = await dex.connect(addr1).deposit({ value: amount })
            await tx.wait()

            const balance = await ethers.provider.getBalance(dex.address)
            expect(balance).to.equal(amount)
        })
    })
})
