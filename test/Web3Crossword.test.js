const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Web3Crossword", () => {
  let crossword, owner, addr1, addr2;
  const hashString = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const hashString2 = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdee";
  const exampleHash = ethers.utils.arrayify(hashString);
  const exampleHash2 = ethers.utils.arrayify(hashString2);
  beforeEach(async () => {
    const Web3Crossword = await ethers.getContractFactory("Web3Crossword");
    [owner, addr1, addr2] = await ethers.getSigners();
    crossword = await Web3Crossword.deploy();
    await crossword.deployed();
  });

  describe("Deployment", () => {
    it("Should set the owner as the deployer", async () => {
      expect(await crossword.owner()).to.equal(owner.address);
    });

    it("Should start with a gamePaused state of false", async () => {
      expect(await crossword.gamePaused()).to.equal(false);
    });

    it("Should start with a currentGameId of 0", async () => {
      expect(await crossword.currentGameId()).to.equal(0);
    });
  });

  describe("storeHash", () => {
    it("Should store the hash for a given participant", async () => {
      console.log("address", addr1.address);
      await crossword.storeHash(addr1.address, exampleHash);
      const crosswordData = await crossword.getCrosswordData(await crossword.currentGameId(), addr1.address);
      console.log("crosswordData", crosswordData);
      expect(crosswordData.hash).to.equal(hashString);
      expect(crosswordData.isWinner).to.equal(false);
    });

    it("Should only be callable by the contract owner", async () => {
      await expect(
        crossword.connect(addr1).storeHash(addr1.address, hashString)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("submitHash", () => {
    it("Should update the hash for the sender", async () => {
      await crossword.submitHash(exampleHash);
      const crosswordData = await crossword.getCrosswordData(await crossword.currentGameId(), owner.address);
      expect(crosswordData.hash).to.equal(hashString);
      expect(crosswordData.isWinner).to.equal(false);
    });

    it("Should revert when game is paused", async () => {
      await crossword.pauseGame(true);
      await expect(crossword.submitHash(exampleHash)).to.be.revertedWith(
        "The game is paused."
      );
    });
  });

  describe("payWinner", () => {
    beforeEach(async () => {
       // Deposit 1 ETH into the contract from addr1
      const depositAmount = ethers.utils.parseEther("3");
      await addr1.sendTransaction({
        to: crossword.address,
        value: depositAmount,
      });

      await crossword.storeHash(addr1.address, exampleHash);
      await crossword.submitHash(exampleHash2);
    });

    it("Should mark the winner and update the crossword history", async () => {
      await crossword.payWinner(addr1.address, ethers.utils.parseEther("1.0"));
      await crossword.advanceGame();
      const crosswordData = await crossword.getCrosswordData((await crossword.currentGameId()) - 1, addr1.address);
      const crosswordHistory = await crossword.crosswordHistory(
        (await crossword.currentGameId()) - 1
      );
      console.log("crosswordHistory", crosswordHistory);
      console.log("crosswordData", crosswordData);
      expect(crosswordData.isWinner).to.equal(true);
      expect(crosswordHistory.winner).to.equal(addr1.address);
      expect(crosswordHistory.prizeAmount).to.equal(
        ethers.utils.parseEther("1.0")
      );
      expect(crosswordHistory.correctHash).to.equal(hashString);
    });

    it("Should revert if participant has already been marked as a winner", async () => {
      await crossword.payWinner(addr1.address, ethers.utils.parseEther("1.0"));
      await expect(
        crossword.payWinner(addr1.address, ethers.utils.parseEther("1.0"))
      ).to.be.revertedWith(
        "This participant has already been marked as a winner."
      );
    });

    it("Should only be callable by the contract owner", async () => {
      await expect(
        crossword
          .connect(addr1)
          .payWinner(addr1.address, ethers.utils.parseEther("1.0"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("pauseGame", () => {
    it("Should pause the game when called with true", async () => {
      await crossword.pauseGame(true);
      expect(await crossword.gamePaused()).to.equal(true);
    });

    it("Should resume the game when called with false", async () => {
      await crossword.pauseGame(true);
      await crossword.pauseGame(false);
      expect(await crossword.gamePaused()).to.equal(false);
    });

    it("Should only be callable by the contract owner", async () => {
      await expect(crossword.connect(addr1).pauseGame(true)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("ejectFunds", () => {
    beforeEach(async () => {
      // Deposit 1 ETH into the contract from addr1
     const depositAmount = ethers.utils.parseEther("3");
     await addr1.sendTransaction({
       to: crossword.address,
       value: depositAmount,
     });
   });
    it("Should transfer the contract balance to the contract owner", async () => {
      await crossword.submitHash(exampleHash);
      await crossword.payWinner(addr1.address, ethers.utils.parseEther("1.0"));
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await crossword.ejectFunds();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should only be callable by the contract owner", async () => {
      await expect(crossword.connect(addr1).ejectFunds()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
