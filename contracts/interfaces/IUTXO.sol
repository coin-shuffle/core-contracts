// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/**
 * @title UTXO-ERC20 interface
 */
interface IUTXO {
    /**
     * @dev UTXO entry contains information about utxo stored in the contract state.
     * The following information will be stored: token address and corresponding token amount,
     * owner of the UTXO and spend flag.
     */
    struct UTXO {
        address token;
        uint256 amount;
        address owner;
        bool spent;
    }

    /**
     * @dev Output contains information about UTXO to be created with.
     */
    struct Output {
        uint256 amount;
        address owner;
    }

    event UTXOCreated(uint256 indexed id, address indexed creator);

    event UTXOSpent(uint256 indexed id, address indexed spender);

    event Deposited(address indexed token, address indexed from, uint256 amount);

    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    /**
     * @dev Input contains information about UTXO to be spent: its identifier and corresponding signature.
     * Signed data always contains the UTXO id.
     * If it is the UTXO transfer operation, the signed information hash also contains concatenated Output's data.
     * If it is the UTXO withdraw operation, the signed information hash also contains the address of receiver.
     */
    struct Input {
        uint256 id;
        bytes signature;
    }

    /**
     * @dev Depositing ERC20 token to the contract. You should approve the transfer on token contract before.
     * @param token_ ERC20 token address to deposit
     * @param amount_ total amount to deposit
     * @param outs_ array of UTXO information to be created
     */
    function deposit(address token_, uint256 amount_, Output[] memory outs_) external;

    /**
     * @dev Withdraw ERC20 token from the contract balance.
     * @param input_ UTXO to withdraw
     * @param to_ address withdraw tokens to
     */
    function withdraw(Input memory input_, address to_) external;

    /**
     * @dev Transfer token from one UTXO to another.
     * @param inputs_ array of UTXO to be spent
     * @param outputs_ array of UTXO to be created
     */
    function transfer(Input[] memory inputs_, Output[] memory outputs_) external;

    /**
     * @dev Get UTXO by id
     * @param id_ UTXO id
     */
    function utxo(uint256 id_) external view returns (UTXO memory);
}
