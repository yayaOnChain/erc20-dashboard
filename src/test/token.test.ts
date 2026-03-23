// Simple test file - requires additional setup for full testing
// Run: npm install --save-dev @nomicfoundation/hardhat-ethers chai @types/chai @types/mocha @types/node ts-node typescript
// Then run: npx hardhat test

import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken", function () {
  it("Should compile and deploy successfully", async function () {
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy(1000000);
    await myToken.waitForDeployment();
    
    const address = await myToken.getAddress();
    expect(address).to.properAddress;
    
    const name = await myToken.name();
    expect(name).to.equal("MyToken");
    
    const symbol = await myToken.symbol();
    expect(symbol).to.equal("MTK");
  });
});
