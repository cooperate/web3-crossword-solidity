// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Web3Crossword is Ownable {
    bool public gamePaused = false;
    uint public currentGameId;
    struct CrosswordData {
        bytes32 hash;
        bool isWinner;
    }

    struct CrosswordHistory {
        address winner;
        uint256 prizeAmount;
        bytes32 correctHash;
    }

    mapping(uint => CrosswordHistory) public crosswordHistory;
    mapping(uint => mapping(address => CrosswordData)) public crosswordData;

    event HashStored(address indexed participant, bytes32 hash);
    event WinnerPaid(address indexed winner, uint256 prize);

    constructor() {}

    function storeHash(address participant, bytes32 hash) external onlyOwner {
        crosswordData[currentGameId][participant] = CrosswordData(hash, false);
        emit HashStored(participant, hash);
    }

    function submitHash(bytes32 hash) external {
        require(!gamePaused, "The game is paused.");
        crosswordData[currentGameId][msg.sender].hash = hash;
    }

    function payWinner(
        address payable winner,
        uint256 prizeAmount
    ) external onlyOwner {
        require(
            !crosswordData[currentGameId][winner].isWinner,
            "This participant has already been marked as a winner."
        );
        crosswordData[currentGameId][winner].isWinner = true;
        crosswordHistory[currentGameId] = CrosswordHistory(
            winner,
            prizeAmount,
            crosswordData[currentGameId][winner].hash
        );
        winner.transfer(prizeAmount);
        emit WinnerPaid(winner, prizeAmount);
    }

    function advanceGame() external onlyOwner {
        currentGameId++;
    }

    function getCrosswordData(
        uint gameId,
        address participant
    ) external view returns (CrosswordData memory) {
        return crosswordData[gameId][participant];
    }

    function pauseGame(bool pause) public onlyOwner {
        gamePaused = pause;
    }

    function ejectFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {
        // Accepts any incoming ether
    }

    fallback() external payable {
        // Accepts any incoming ether
    }
}
