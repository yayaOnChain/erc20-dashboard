import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const initialSupply = 1000000; // 1 million tokens

  // Get the signer from hardhat
  const [deployer] = await ethers.getSigners();

  const MyToken = await ethers.getContractFactory("MyToken", deployer);
  const myToken = await MyToken.deploy(initialSupply);

  await myToken.waitForDeployment();

  const address = await myToken.getAddress();
  console.log(`MyToken deployed to: ${address}`);

  // Save address to a file for frontend use
  const contractAddress = {
    address: address,
    network: "sepolia",
    chainId: 11155111,
  };

  fs.writeFileSync(
    "../../contract-address.json",
    JSON.stringify(contractAddress, null, 2)
  );
  console.log("\n💾 Contract address saved to contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
