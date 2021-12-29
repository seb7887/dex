import { expect } from "chai"
import { ethers } from "hardhat"

describe("IaoToken", () => {
    let deployer: any
    let token: any

    before(async () => {
        [deployer] = await ethers.getSigners()

        const Token = await ethers.getContractFactory("IaoToken")
        token = await Token.deploy("Test Token", "TKN", 31337)
        await token.deployed()
    })

    it("sets name and symbol when created", async () => {
        expect(await token.name()).to.equal("Test Token")
        expect(await token.symbol()).to.equal("TKN")
    })
})