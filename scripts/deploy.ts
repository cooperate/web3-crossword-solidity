import { ethers } from "hardhat";

async function main() {
  const Web3Crossword = await ethers.getContractFactory("Web3Crossword");
  const Web3CrosswordCoordinator = await Web3Crossword.deploy("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

  await Web3CrosswordCoordinator.deployed();

  console.log("MoneyGameCoordinator deployed to:", Web3CrosswordCoordinator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
