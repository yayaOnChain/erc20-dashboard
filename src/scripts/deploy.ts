import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

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
  const contractInfo = {
    address: address,
    network: "hardhat",
    chainId: 31337,
  };

  const outputPath = path.join(__dirname, "../utils/contractInfo.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
  console.log(`Contract info saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
