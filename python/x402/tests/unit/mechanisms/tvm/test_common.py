"""Tests for shared TVM codec helpers in ``x402.mechanisms.tvm.codecs.common``."""

from __future__ import annotations

import base64

import pytest

pytest.importorskip("pytoniq_core")

from pytoniq_core import Address, Builder, Cell
from pytoniq_core.boc.address import AddressError

from x402.mechanisms.tvm.codecs.common import (
    address_to_stack_item,
    decode_base64_boc,
    encode_base64_boc,
    get_network_global_id,
    make_zero_bit_cell,
    normalize_address,
    parse_amount,
    parse_money_to_decimal,
)

RAW_ADDR = "0:" + "a" * 64
USER_FRIENDLY_BOUNCEABLE = "EQCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqseb"


class TestNormalizeAddress:
    def test_passes_through_already_normalized_raw_address(self) -> None:
        assert normalize_address(RAW_ADDR) == RAW_ADDR

    def test_accepts_address_object_input(self) -> None:
        addr = Address(RAW_ADDR)

        assert normalize_address(addr) == RAW_ADDR

    def test_normalizes_user_friendly_to_raw(self) -> None:
        normalized = normalize_address(USER_FRIENDLY_BOUNCEABLE)

        assert normalized.startswith("0:")
        assert len(normalized) == 66
        assert normalized == Address(USER_FRIENDLY_BOUNCEABLE).to_str(is_user_friendly=False)

    def test_string_and_address_input_produce_same_result(self) -> None:
        addr = Address(USER_FRIENDLY_BOUNCEABLE)

        assert normalize_address(USER_FRIENDLY_BOUNCEABLE) == normalize_address(addr)

    def test_rejects_invalid_address_string(self) -> None:
        with pytest.raises(AddressError):
            normalize_address("not-an-address")


class TestAddressToStackItem:
    def test_returns_slice_typed_stack_entry(self) -> None:
        item = address_to_stack_item(RAW_ADDR)

        assert isinstance(item, dict)
        assert item["type"] == "slice"
        assert isinstance(item["value"], str)

    def test_value_is_valid_base64_boc(self) -> None:
        item = address_to_stack_item(RAW_ADDR)

        decoded = base64.b64decode(item["value"])
        cell = Cell.one_from_boc(decoded)

        slice_ = cell.begin_parse()
        loaded = slice_.load_address()
        assert loaded.to_str(is_user_friendly=False) == RAW_ADDR

    def test_accepts_user_friendly_address_input(self) -> None:
        item = address_to_stack_item(USER_FRIENDLY_BOUNCEABLE)

        cell = Cell.one_from_boc(base64.b64decode(item["value"]))
        loaded = cell.begin_parse().load_address()
        expected = Address(USER_FRIENDLY_BOUNCEABLE).to_str(is_user_friendly=False)
        assert loaded.to_str(is_user_friendly=False) == expected


class TestDecodeBase64Boc:
    def test_round_trips_with_encode_base64_boc(self) -> None:
        original = make_zero_bit_cell()
        encoded = encode_base64_boc(original)

        decoded = decode_base64_boc(encoded)

        assert isinstance(decoded, Cell)
        assert decoded.to_boc() == original.to_boc()

    def test_rejects_non_string_input(self) -> None:
        with pytest.raises(ValueError, match="base64-encoded BoC string"):
            decode_base64_boc(b"raw-bytes")

        with pytest.raises(ValueError, match="base64-encoded BoC string"):
            decode_base64_boc(None)

        with pytest.raises(ValueError, match="base64-encoded BoC string"):
            decode_base64_boc(123)

    def test_rejects_invalid_base64_string(self) -> None:
        with pytest.raises(ValueError, match="base64-encoded BoC string"):
            decode_base64_boc("not!valid#base64")


class TestMakeZeroBitCell:
    def test_returns_a_cell_instance(self) -> None:
        cell = make_zero_bit_cell()

        assert isinstance(cell, Cell)

    def test_cell_holds_a_single_zero_bit(self) -> None:
        cell = make_zero_bit_cell()

        slice_ = cell.begin_parse()
        assert slice_.remaining_bits == 1
        assert slice_.load_bit() == 0

    def test_is_deterministic_across_calls(self) -> None:
        first = make_zero_bit_cell()
        second = make_zero_bit_cell()

        assert first.to_boc() == second.to_boc()

    def test_matches_manual_zero_bit_construction(self) -> None:
        manual = Builder().store_bit(0).end_cell()

        assert make_zero_bit_cell().to_boc() == manual.to_boc()


class TestEncodeBase64Boc:
    def test_returns_string(self) -> None:
        encoded = encode_base64_boc(make_zero_bit_cell())

        assert isinstance(encoded, str)

    def test_value_decodes_to_original_cell_bytes(self) -> None:
        cell = make_zero_bit_cell()

        encoded = encode_base64_boc(cell)

        assert base64.b64decode(encoded) == cell.to_boc()

    def test_round_trips_with_decode_base64_boc_for_richer_cell(self) -> None:
        cell = Builder().store_uint(42, 32).store_address(Address(RAW_ADDR)).end_cell()

        encoded = encode_base64_boc(cell)
        decoded = decode_base64_boc(encoded)

        assert decoded.to_boc() == cell.to_boc()


class TestGetNetworkGlobalId:
    def test_extracts_negative_mainnet_id(self) -> None:
        assert get_network_global_id("tvm:-239") == -239

    def test_extracts_negative_testnet_id(self) -> None:
        assert get_network_global_id("tvm:-3") == -3

    def test_extracts_positive_id(self) -> None:
        assert get_network_global_id("tvm:42") == 42

    def test_rejects_network_without_tvm_prefix(self) -> None:
        with pytest.raises(ValueError, match="Unsupported TVM network"):
            get_network_global_id("eip155:8453")

    def test_rejects_empty_string(self) -> None:
        with pytest.raises(ValueError, match="Unsupported TVM network"):
            get_network_global_id("")

    def test_rejects_uppercase_prefix(self) -> None:
        with pytest.raises(ValueError, match="Unsupported TVM network"):
            get_network_global_id("TVM:-239")

    def test_rejects_non_numeric_payload(self) -> None:
        with pytest.raises(ValueError):
            get_network_global_id("tvm:not-a-number")


class TestParseAmount:
    def test_converts_decimal_string_to_smallest_unit(self) -> None:
        assert parse_amount("1", 6) == 1_000_000
        assert parse_amount("0.001", 6) == 1_000

    def test_handles_zero(self) -> None:
        assert parse_amount("0", 6) == 0
        assert parse_amount("0.0", 9) == 0

    def test_handles_zero_decimals(self) -> None:
        assert parse_amount("5", 0) == 5
        assert parse_amount("123", 0) == 123

    def test_truncates_excess_precision_via_int_conversion(self) -> None:
        assert parse_amount("0.0000001", 6) == 0
        assert parse_amount("1.9999999", 6) == 1_999_999

    def test_supports_nine_decimal_ton_native_amounts(self) -> None:
        assert parse_amount("1", 9) == 1_000_000_000
        assert parse_amount("0.000000001", 9) == 1

    def test_rejects_non_numeric_amount(self) -> None:
        from decimal import InvalidOperation

        with pytest.raises(InvalidOperation):
            parse_amount("not-a-number", 6)


class TestParseMoneyToDecimal:
    def test_passes_through_int_unchanged(self) -> None:
        assert parse_money_to_decimal(5) == 5.0
        assert isinstance(parse_money_to_decimal(5), float)

    def test_passes_through_float_unchanged(self) -> None:
        assert parse_money_to_decimal(2.5) == 2.5

    def test_strips_dollar_sign_prefix(self) -> None:
        assert parse_money_to_decimal("$0.10") == 0.10
        assert parse_money_to_decimal("$1") == 1.0

    def test_strips_uppercase_currency_suffix(self) -> None:
        assert parse_money_to_decimal("2.5 USD") == 2.5
        assert parse_money_to_decimal("3.14 USDT") == 3.14

    def test_strips_lowercase_currency_suffix(self) -> None:
        assert parse_money_to_decimal("2.5 usd") == 2.5
        assert parse_money_to_decimal("3.14 usdt") == 3.14

    def test_strips_currency_suffix_without_separating_space(self) -> None:
        assert parse_money_to_decimal("2.5USD") == 2.5
        assert parse_money_to_decimal("3.14usdt") == 3.14

    def test_strips_dollar_prefix_and_currency_suffix_together(self) -> None:
        assert parse_money_to_decimal("$2.5 USD") == 2.5

    def test_handles_surrounding_whitespace(self) -> None:
        assert parse_money_to_decimal("  1.25  ") == 1.25
        assert parse_money_to_decimal("  $1.25 USDT  ") == 1.25

    def test_returns_float_type_for_string_input(self) -> None:
        assert isinstance(parse_money_to_decimal("1.5"), float)
        assert isinstance(parse_money_to_decimal("$1"), float)

    def test_rejects_unparseable_string(self) -> None:
        with pytest.raises(ValueError):
            parse_money_to_decimal("not-money")
