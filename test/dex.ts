import { ethers, waffle } from "hardhat"
import { expect } from "chai"

const { provider } = waffle

const totalSupply = ethers.utils.parseEther("10000")
const amountA = ethers.utils.parseEther("2000")
const amountB = ethers.utils.parseEther("1000")
const amountC = ethers.utils.parseEther("500")
let token: any
let dex: any
let deployer: any
let alice: any
let bob: any
let trx: any

describe("Dex", () => {
    beforeEach(async () => {
        [deployer, bob, alice] = await ethers.getSigners()
        const Token = await ethers.getContractFactory("IaoToken")
        token = await Token.deploy("Iao", "IAO", totalSupply)
        await token.deployed()

        const Dex = await ethers.getContractFactory("Dex")
        dex = await Dex.deploy(token.address)
        await dex.deployed()
    })

    describe("addLiquidity", () => {
        it("happy path", async () => {
            await token.approve(dex.address, amountA)
            trx = dex.addLiquidity(amountA, { value: amountB })
            await expect(trx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            expect(await provider.getBalance(dex.address)).to.equal(amountB)
            expect(await dex.getReserve()).to.equal(amountA)
        })
        it("should revert trx if sender has not enough tokens", async () => {
            await token.approve(dex.address, amountA)
            trx = dex.addLiquidity(amountA, { value: amountB })
            await expect(trx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            await token.approve(dex.address, amountC)
            trx = dex.addLiquidity(amountC, { value: amountB })

            await expect(trx).to.be.revertedWith("insufficient token amount");
        })
    })
})
