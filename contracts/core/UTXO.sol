// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "../interfaces/IUTXO.sol";

contract UTXOERC20 is IUTXO {
    using ECDSA for bytes32;

    UTXO[] public utxos;

    function deposit(address token_, uint256 amount_, Output[] memory outs_) public override {
        require(outs_.length > 0, "empty output");
        require(getOutAmount(outs_) == amount_, "invalid amounts");

        IERC20(token_).transferFrom(msg.sender, address(this), amount_);

        uint256 _id = utxos.length;
        for (uint _i = 0; _i < outs_.length; _i++) {
            UTXO memory _utxo = UTXO(token_, outs_[_i].amount, outs_[_i].owner, false);
            utxos.push(_utxo);

            emit UTXOCreated(_id++, msg.sender);
        }

        emit Deposited(token_, msg.sender, amount_);
    }

    function getOutAmount(Output[] memory outs_) internal pure returns (uint256 result) {
        for (uint i = 0; i < outs_.length; i++) {
            result += outs_[i].amount;
        }
    }

    function withdraw(Input memory input_, address to_) public override {
        require(input_.id < utxos.length, "UTXO id out of bound");

        UTXO memory utxo_ = utxos[input_.id];
        require(!utxo_.spent, "UTXO has been spent");

        bytes memory data_ = abi.encodePacked(input_.id, to_);
        require(utxo_.owner == keccak256(data_).recover(input_.signature), "invalid signature");

        utxos[input_.id].spent = true;
        IERC20(utxo_.token).transfer(to_, utxo_.amount);

        emit UTXOSpent(input_.id, msg.sender);
        emit Withdrawn(utxo_.token, to_, utxo_.amount);
    }

    function transfer(Input[] memory inputs_, Output[] memory outputs_) public override {
        require(outputs_.length != 0, "invalid out: can not be empty");
        require(inputs_.length != 0, "invalid in: can not be empty");

        uint256 outAmount_ = 0;
        bytes memory data_;
        for (uint _i = 0; _i < outputs_.length; _i++) {
            outAmount_ += outputs_[_i].amount;
            data_ = abi.encodePacked(data_, outputs_[_i].amount, outputs_[_i].owner);
        }

        address token_ = utxos[inputs_[0].id].token;
        uint256 inAmount_ = 0;
        for (uint i = 0; i < inputs_.length; i++) {
            require(inputs_[i].id < utxos.length, "UTXO id out of bound");

            UTXO memory utxo_ = utxos[inputs_[i].id];

            require(token_ == utxo_.token, "all UTXO should be for the same token");
            require(!utxo_.spent, "UTXO has been spent");
            require(
                utxo_.owner ==
                    keccak256(abi.encodePacked(inputs_[i].id, data_)).recover(
                        inputs_[i].signature
                    ),
                "invalid signature"
            );

            inAmount_ += utxo_.amount;
            utxos[inputs_[i].id].spent = true;

            emit UTXOSpent(inputs_[i].id, msg.sender);
        }

        require(inAmount_ == outAmount_, "invalid amounts");

        uint256 id_ = utxos.length;
        for (uint i = 0; i < outputs_.length; i++) {
            UTXO memory _newUtxo = UTXO(token_, outputs_[i].amount, outputs_[i].owner, false);
            utxos.push(_newUtxo);

            emit UTXOCreated(id_++, msg.sender);
        }
    }

    function utxo(uint256 id_) public view override returns (UTXO memory) {
        require(id_ < utxos.length, "UTXO id out of bound");

        return utxos[id_];
    }
}
