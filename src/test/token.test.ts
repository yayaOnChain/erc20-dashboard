import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MyToken, MyToken__factory } from "../typechain-types";
import hre from "hardhat";

describe("MyToken", function () {
  let myToken: MyToken;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let ownerAddress: string;
  let addr1Address: string;
  let addr2Address: string;
  const initialSupply = 1000000;

  beforeEach(async function () {
    const MyTokenFactory = await hre.ethers.getContractFactory("MyToken") as MyToken__factory;
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();
    addr2Address = await addr2.getAddress();
    myToken = await MyTokenFactory.deploy(initialSupply);
    await myToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await myToken.getAddress();
      expect(address).to.be.a.properAddress;
    });

    it("Should set the correct token name", async function () {
      expect(await myToken.name()).to.equal("MyToken");
    });

    it("Should set the correct token symbol", async function () {
      expect(await myToken.symbol()).to.equal("MTK");
    });

    it("Should set decimals to 18", async function () {
      expect(await myToken.decimals()).to.equal(18);
    });

    it("Should assign initial supply to owner", async function () {
      const ownerBalance = await myToken.balanceOf(ownerAddress);
      const expectedSupply = BigInt(initialSupply) * BigInt(10 ** 18);
      expect(ownerBalance).to.equal(expectedSupply);
    });

    it("Should set total supply correctly", async function () {
      const totalSupply = await myToken.totalSupply();
      const expectedSupply = BigInt(initialSupply) * BigInt(10 ** 18);
      expect(totalSupply).to.equal(expectedSupply);
    });
  });

  describe("Mint", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = 500000;
      await myToken.connect(owner).mint(mintAmount);
      
      const ownerBalance = await myToken.balanceOf(ownerAddress);
      const expectedBalance = BigInt(initialSupply + mintAmount) * BigInt(10 ** 18);
      expect(ownerBalance).to.equal(expectedBalance);
    });

    it("Should increase total supply after minting", async function () {
      const mintAmount = 500000;
      const initialTotalSupply = await myToken.totalSupply();
      
      await myToken.connect(owner).mint(mintAmount);
      
      const newTotalSupply = await myToken.totalSupply();
      const expectedIncrease = BigInt(mintAmount) * BigInt(10 ** 18);
      expect(newTotalSupply).to.equal(initialTotalSupply + expectedIncrease);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = 500000;
      await expect(myToken.connect(addr1).mint(mintAmount))
        .to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount")
        .withArgs(addr1Address);
    });
  });

  describe("Burn", function () {
    it("Should allow any holder to burn tokens", async function () {
      const burnAmount = 100000;
      const initialBalance = await myToken.balanceOf(ownerAddress);
      
      await myToken.connect(owner).burn(burnAmount);
      
      const newBalance = await myToken.balanceOf(ownerAddress);
      const expectedDecrease = BigInt(burnAmount) * BigInt(10 ** 18);
      expect(newBalance).to.equal(initialBalance - expectedDecrease);
    });

    it("Should decrease total supply after burning", async function () {
      const burnAmount = 100000;
      const initialTotalSupply = await myToken.totalSupply();
      
      await myToken.connect(owner).burn(burnAmount);
      
      const newTotalSupply = await myToken.totalSupply();
      const expectedDecrease = BigInt(burnAmount) * BigInt(10 ** 18);
      expect(newTotalSupply).to.equal(initialTotalSupply - expectedDecrease);
    });

    it("Should allow addr1 to burn their tokens", async function () {
      const transferAmount = 100000;
      const burnAmount = 50000;
      
      await myToken.connect(owner).transfer(addr1Address, BigInt(transferAmount) * BigInt(10 ** 18));
      
      const initialBalance = await myToken.balanceOf(addr1Address);
      await myToken.connect(addr1).burn(burnAmount);
      const newBalance = await myToken.balanceOf(addr1Address);
      
      const expectedDecrease = BigInt(burnAmount) * BigInt(10 ** 18);
      expect(newBalance).to.equal(initialBalance - expectedDecrease);
    });

    it("Should revert if burning more than balance", async function () {
      const burnAmount = 2000000;
      await expect(myToken.connect(owner).burn(burnAmount))
        .to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance")
        .withArgs(ownerAddress, BigInt(initialSupply) * BigInt(10 ** 18), BigInt(burnAmount) * BigInt(10 ** 18));
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = 100000;
      
      await myToken.connect(owner).transfer(addr1Address, BigInt(transferAmount) * BigInt(10 ** 18));
      
      const addr1Balance = await myToken.balanceOf(addr1Address);
      const ownerBalance = await myToken.balanceOf(ownerAddress);
      
      expect(addr1Balance).to.equal(BigInt(transferAmount) * BigInt(10 ** 18));
      expect(ownerBalance).to.equal(BigInt(initialSupply - transferAmount) * BigInt(10 ** 18));
    });

    it("Should emit Transfer event", async function () {
      const transferAmount = 50000;
      
      await expect(myToken.connect(owner).transfer(addr1Address, BigInt(transferAmount) * BigInt(10 ** 18)))
        .to.emit(myToken, "Transfer")
        .withArgs(ownerAddress, addr1Address, BigInt(transferAmount) * BigInt(10 ** 18));
    });

    it("Should revert if transferring more than balance", async function () {
      const transferAmount = 2000000;
      await expect(myToken.connect(owner).transfer(addr1Address, BigInt(transferAmount) * BigInt(10 ** 18)))
        .to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance")
        .withArgs(ownerAddress, BigInt(initialSupply) * BigInt(10 ** 18), BigInt(transferAmount) * BigInt(10 ** 18));
    });

    it("Should revert if transferring to zero address", async function () {
      const transferAmount = 100000;
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      await expect(myToken.connect(owner).transfer(zeroAddress, BigInt(transferAmount) * BigInt(10 ** 18)))
        .to.be.revertedWithCustomError(myToken, "ERC20InvalidReceiver")
        .withArgs(hre.ethers.ZeroAddress);
    });

    it("Should revert if transferring from zero address", async function () {
      const transferAmount = 100000;
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      await expect(myToken.connect(addr1).transferFrom(zeroAddress, addr1Address, BigInt(transferAmount) * BigInt(10 ** 18)))
        .to.be.reverted;
    });
  });

  describe("TransferFrom", function () {
    it("Should transfer tokens using approve and transferFrom", async function () {
      const approveAmount = 50000;
      
      await myToken.connect(owner).approve(addr1Address, BigInt(approveAmount) * BigInt(10 ** 18));
      
      await myToken.connect(addr1).transferFrom(ownerAddress, addr2Address, BigInt(approveAmount) * BigInt(10 ** 18));
      
      const addr2Balance = await myToken.balanceOf(addr2Address);
      expect(addr2Balance).to.equal(BigInt(approveAmount) * BigInt(10 ** 18));
    });

    it("Should emit Approval event", async function () {
      const approveAmount = 30000;
      
      await expect(myToken.connect(owner).approve(addr1Address, BigInt(approveAmount) * BigInt(10 ** 18)))
        .to.emit(myToken, "Approval")
        .withArgs(ownerAddress, addr1Address, BigInt(approveAmount) * BigInt(10 ** 18));
    });

    it("Should update allowance after transferFrom", async function () {
      const approveAmount = 50000;
      const transferAmount = 30000;
      
      await myToken.connect(owner).approve(addr1Address, BigInt(approveAmount) * BigInt(10 ** 18));
      await myToken.connect(addr1).transferFrom(ownerAddress, addr2Address, BigInt(transferAmount) * BigInt(10 ** 18));
      
      const remainingAllowance = await myToken.allowance(ownerAddress, addr1Address);
      const expectedAllowance = BigInt(approveAmount - transferAmount) * BigInt(10 ** 18);
      expect(remainingAllowance).to.equal(expectedAllowance);
    });

    it("Should revert if transferring more than allowance", async function () {
      const approveAmount = 50000;
      const transferAmount = 100000;
      
      await myToken.connect(owner).approve(addr1Address, BigInt(approveAmount) * BigInt(10 ** 18));
      
      await expect(myToken.connect(addr1).transferFrom(ownerAddress, addr2Address, BigInt(transferAmount) * BigInt(10 ** 18)))
        .to.be.revertedWithCustomError(myToken, "ERC20InsufficientAllowance")
        .withArgs(addr1Address, BigInt(approveAmount) * BigInt(10 ** 18), BigInt(transferAmount) * BigInt(10 ** 18));
    });
  });

  describe("Access Control", function () {
    it("Should have the correct owner", async function () {
      expect(await myToken.owner()).to.equal(ownerAddress);
    });

    it("Should allow owner to renounce ownership", async function () {
      await myToken.connect(owner).renounceOwnership();
      expect(await myToken.owner()).to.equal(hre.ethers.ZeroAddress);
    });

    it("Should allow owner to transfer ownership", async function () {
      await myToken.connect(owner).transferOwnership(addr1Address);
      expect(await myToken.owner()).to.equal(addr1Address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(myToken.connect(addr1).transferOwnership(addr2Address))
        .to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount")
        .withArgs(addr1Address);
    });
  });
});
