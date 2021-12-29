import { expect } from "chai"
import { ethers } from "hardhat"
import { toWei } from "./utils"

describe("DexFactory", () => {
    let factory: any
    let token: any

    beforeEach(async () => {
        const Token = await ethers.getContractFactory("IaoToken")
        token = await Token.deploy("Token", "TKN", toWei("1000000"))
        await token.deployed()

        const Factory = await ethers.getContractFactory("DexFactory")
        factory = await Factory.deploy()
        await factory.deployed()
    })

    it("should be deployed", async () => {
        expect(await factory.deployed()).to.equal(factory)
    })

    describe("createDex", () => {
        it("should deploy an exchange", async () => {
            const dexAddress = await factory.callStatic.createDex(token.address)
            await factory.createDex(token.address)

            expect(await factory.tokenToDex(token.address)).to.equal(dexAddress)
        })
        it("should not allow address 0", async () => {
            await expect(
                factory.createDex("0x0000000000000000000000000000000000000000")
            ).to.be.revertedWith("invalid token address")
        })
        it("should fail if exchange exists", async () => {
            await factory.createDex(token.address)
            await expect(factory.createDex(token.address)).to.be.revertedWith(
                "dex already exists"
            )
        })
    })

    describe("getDex", () => {
        it("should return exchange address by token address", async () => {
            const dexAddress = await factory.callStatic.createDex(token.address)
            await factory.createDex(token.address)

            expect(await factory.getDex(token.address)).to.equal(dexAddress)
        })
    })
})
