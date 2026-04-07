import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const initialSupply = 1000000; // 1 million tokens

  // Get the signer from hardhat
  const [deployer] = await hre.ethers.getSigners();

  const MyToken = await hre.ethers.getContractFactory("MyToken", deployer);
  const myToken = await MyToken.deploy(initialSupply);

  await myToken.waitForDeployment();

  const address = await myToken.getAddress();
  console.log(`MyToken deployed to: ${address}`);

  const network = hre.network.name;

  // Save address to a file for frontend use
  const contractAddress = {
    address: address,
    network: network,
    chainId: hre.network.config.chainId,
  };

  const filename = network === "localhost"
    ? "contract-address-local.json"
    : network === "sepolia"
      ? "contract-address-sepolia.json"
      : `contract-address-${network}.json`;
  const contractAddressPath = path.join(__dirname, `../../${filename}`);
  fs.writeFileSync(
    contractAddressPath,
    JSON.stringify(contractAddress, null, 2)
  );
  console.log(`\n💾 Contract address saved to ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
