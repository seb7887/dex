import { ethers, waffle } from "hardhat"
import { expect } from "chai"
import { toWei, fromWei, getBalance, createDex } from "./utils"

const { provider } = waffle

const totalSupply = ethers.utils.parseEther("10000")
const amountA = ethers.utils.parseEther("2000")
const amountB = ethers.utils.parseEther("1000")
const amountC = ethers.utils.parseEther("500")
let token: any
let dex: any
let deployer: any
let bob: any
let alice: any
let tx: any

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
            tx = dex.addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            expect(await provider.getBalance(dex.address)).to.equal(amountB)
            expect(await dex.getReserve()).to.equal(amountA)
        })
        it("should revert trx if sender has not enough tokens", async () => {
            await token.approve(dex.address, amountA)
            tx = dex.addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            await token.approve(dex.address, amountC)
            tx = dex.addLiquidity(amountC, { value: amountB })

            await expect(tx).to.be.revertedWith("insufficient token amount");
        })
    })

    describe("removeLiquidity", () => {
        it("happy path", async () => {
            await token.approve(dex.address, amountA)
            token.transfer(bob.address, totalSupply)
            await token.connect(bob).approve(dex.address, totalSupply)
            tx = dex.connect(bob).addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                bob.address,
                amountB,
                amountA
            )

            expect(await provider.getBalance(dex.address)).to.equal(amountB)
            expect(await dex.getReserve()).to.equal(amountA)

            const lpAmount = await dex.balanceOf(bob.address)

            tx = dex.connect(bob).removeLiquidity(lpAmount)
            await expect(tx).to.emit(dex, "RemoveLiquidity").withArgs(
                bob.address,
                amountB,
                amountA
            )
        })
        it("should revert if amount equals to zero", async () => {
            const amount = ethers.utils.parseEther("0")
            tx = dex.removeLiquidity(amount)
            await expect(tx).to.be.revertedWith("invalid amount to withdraw")
        })
    })

    describe("getEthAmount", () => {
        it("should return correct ETH price", async () => {
            await token.approve(dex.address, amountA)
            tx = dex.addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            let bar = await dex.getEthAmount(ethers.utils.parseEther("2"))
            expect(ethers.utils.formatEther(bar)).to.eq("0.989020869339354039")

            bar = await dex.getEthAmount(ethers.utils.parseEther("100"));
            expect(ethers.utils.formatEther(bar)).to.eq("47.16531681753215817");

            bar = await dex.getEthAmount(ethers.utils.parseEther("2000"));
            expect(ethers.utils.formatEther(bar)).to.eq("497.487437185929648241");
        })
    })

    describe("ethToTokenSwap", () => {
        it("happy path", async () => {
            await token.approve(dex.address, amountA)
            tx = dex.addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )

            const bobExpectedOutput = await dex.getEthAmount(ethers.utils.parseEther("2"))
            tx = await dex.connect(bob).ethToTokenSwap(bobExpectedOutput, { value: ethers.utils.parseEther("2") })

            await expect(tx).to.emit(dex, "TokenPurchase").withArgs(
                bob.address,
                ethers.utils.parseEther("2"),
                ethers.utils.parseEther("3.952174694105670771")
            )
        })
    })

    describe("tokenToEthSwap", () => {
        beforeEach(async () => {
            await token.transfer(bob.address, toWei("22"))
            await token.connect(bob).approve(dex.address, toWei("22"))

            await token.approve(dex.address, toWei("2000"))
            await dex.addLiquidity(toWei("2000"), { value: toWei("1000") })
        })

        it("happy path", async () => {
            tx = await dex.connect(bob).tokenToEthSwap(toWei("2"), toWei("0.9"))
            await expect(tx).to.emit(dex, "EthPurchase").withArgs(
                bob.address,
                toWei("0.989020869339354039"),
                toWei("2")
            )

            const dexTokenBalance = await token.balanceOf(dex.address)
            expect(fromWei(dexTokenBalance)).to.equal("2002.0")
        })
        it("should revert if output amount is insufficient", async () => {
            await expect(
                dex.connect(bob).tokenToEthSwap(toWei("2"), toWei("1.0"))
            ).to.be.revertedWith("insufficient output amount")
        })
    })

    describe("tokenToTokenSwap", () => {
        it("happy path", async () => {
            const Factory = await ethers.getContractFactory("DexFactory")
            const Token = await ethers.getContractFactory("IaoToken")

            const factory = await Factory.deploy()
            const tkn1 = await Token.deploy("TokenA", "AAA", toWei("1000000"))
            const tkn2 = await Token.deploy("TokenB", "BBB", toWei("1000000"))

            await factory.deployed()
            await tkn1.deployed()
            await tkn2.deployed()

            const dex1 = await createDex(factory, tkn1.address, deployer)
            const dex2 = await createDex(factory, tkn2.address, alice)

            await tkn1.approve(dex1.address, amountA)
            await dex1.addLiquidity(amountA, { value: amountB })

            await tkn2.transfer(alice.address, amountB)
            await tkn2.connect(alice).approve(dex2.address, amountB)
            await dex2.connect(alice).addLiquidity(amountB, { value: amountB })

            expect(await tkn2.balanceOf(deployer.address)).to.equal("999999999999999999999000000000000000000000")

            await tkn1.approve(dex1.address, toWei("10"))
            await dex1.tokenToTokenSwap(toWei("10"), toWei("4.8"), tkn2.address)

            expect(fromWei(await tkn2.balanceOf(deployer.address))).to.equal("999999999999999999999004.852698493489877956")
        })
        it("should revert if cannot find Dex address in the registry", async () => {
            const Factory = await ethers.getContractFactory("DexFactory")
            const Token = await ethers.getContractFactory("IaoToken")

            const factory = await Factory.deploy()
            const tkn1 = await Token.deploy("TokenA", "AAA", toWei("1000000"))

            await factory.deployed()
            await tkn1.deployed()

            const dex1 = await createDex(factory, tkn1.address, deployer)

            await tkn1.approve(dex1.address, amountA)
            await dex1.addLiquidity(amountA, { value: amountB })

            await tkn1.approve(dex1.address, toWei("10"))
            tx = dex1.tokenToTokenSwap(toWei("10"), toWei("4.8"), token.address)

            await expect(tx).to.be.revertedWith("invalid dex address")
        })
    })
})
