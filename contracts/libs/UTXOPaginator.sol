// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./UTXOArray.sol";

/**
 *  @notice Library for UTXO pagination.
 */
library Paginator {
    using UTXOArray for UTXOArray.Array;

    /**
     *  @notice Returns part of an array.
     *
     *  Examples:
     *  - part([4, 5, 6, 7], 0, 4) will return [4, 5, 6, 7]
     *  - part([4, 5, 6, 7], 2, 4) will return [6, 7]
     *  - part([4, 5, 6, 7], 2, 1) will return [6]
     *
     *  @param array Storage array.
     *  @param offset_ Offset, index in an array.
     *  @param limit_ Number of elements after the `offset`.
     */
    function part(
        UTXOArray.Array storage array,
        uint256 offset_,
        uint256 limit_
    ) internal view returns (IUTXO.UTXO[] memory list_) {
        uint256 to_ = _handleIncomingParametersForPart(array.length(), offset_, limit_);

        list_ = new IUTXO.UTXO[](to_ - offset_);

        for (uint256 i = offset_; i < to_; i++) {
            list_[i - offset_] = array.at(i);
        }
    }

    function partByAddress(
        UTXOArray.Array storage array,
        address user_,
        uint256 offset_,
        uint256 limit_
    ) internal view returns (IUTXO.UTXO[] memory list_) {
        uint256 to_ = _handleIncomingParametersForPart(array.length(), offset_, limit_);

        list_ = new IUTXO.UTXO[](to_ - offset_);

        for (uint256 i = offset_; i < to_; i++) {
            if (array.at(i).owner == user_ && !array.at(i).isSpent) {
                list_[i - offset_] = array.at(i);
            }
        }
    }

    function _handleIncomingParametersForPart(
        uint256 length_,
        uint256 offset_,
        uint256 limit_
    ) private pure returns (uint256 to_) {
        to_ = offset_ + limit_;

        if (to_ > length_) {
            to_ = length_;
        }

        if (offset_ > to_) {
            to_ = offset_;
        }
    }
}
