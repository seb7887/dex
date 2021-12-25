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
            await expect(tx).to.revertedWith("invalid amount to withdraw")
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
        it("happy path", async () => {
            await token.approve(dex.address, amountA)
            tx = dex.addLiquidity(amountA, { value: amountB })
            await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
                deployer.address,
                amountB,
                amountA
            )
            const tknSold = ethers.utils.parseEther("1")
            const bobExpectedOutput = await dex.getTokenAmount(tknSold)
            tx = await dex.connect(bob).tokenToEthSwap(bobExpectedOutput, ethers.utils.parseEther("0.5"))

            await expect(tx).to.emit(dex, "EthPurchase")
        })
        // it("should revert if output amount is insufficient", async () => {
        //     await token.approve(dex.address, amountA)
        //     tx = dex.addLiquidity(amountA, { value: amountB })
        //     await expect(tx).to.emit(dex, "AddLiquidity").withArgs(
        //         deployer.address,
        //         amountB,
        //         amountA
        //     )
        //     const tknSold = ethers.utils.parseEther("1")
        //     const bobExpectedOutput = await dex.getTokenAmount(tknSold)
        //     tx = await dex.connect(bob).tokenToEthSwap(bobExpectedOutput, ethers.utils.parseEther("2"))

        //     await expect(tx).to.be.revertedWith("insufficient output amount")
        // })
    })
})
