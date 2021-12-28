import { ethers } from "hardhat"

export const toWei = (value: string) => {
    return ethers.utils.parseEther(value)
}

export const fromWei = (value: any) => {
    return ethers.utils.formatEther(
        typeof value === "string" ? value : value.toString()
    )
}

export const getBalance = ethers.provider.getBalance

export const createDex = async (factory: any, tokenAddress: any, sender: any) => {
    const dexAddress = await factory.connect(sender).callStatic.createDex(tokenAddress)

    await factory.connect(sender).createDex(tokenAddress)

    const Dex = await ethers.getContractFactory("Dex")

    return Dex.attach(dexAddress)
}