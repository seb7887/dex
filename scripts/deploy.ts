import { ethers } from "hardhat"

async function main() {
    const Iao = await ethers.getContractFactory("IaoToken")
    const iao = await Iao.deploy()
    await iao.deployed()

    const Dex = await ethers.getContractFactory("DEX")
    const dex = await Dex.deploy(iao.address)
    await dex.deployed()

    console.log("IaoToken deployed to:", iao.address)
    console.log("DEX deployed to:", dex.address)
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err)
        process.exit(1)
    })
