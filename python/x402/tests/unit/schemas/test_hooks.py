"""Tests for x402.schemas.hooks dataclass results and contexts."""

from unittest.mock import MagicMock

import pytest

from x402.schemas.hooks import (
    AbortResult,
    PaymentCreatedContext,
    PaymentCreationContext,
    PaymentCreationFailureContext,
    RecoveredPayloadResult,
    RecoveredSettleResult,
    RecoveredVerifyResult,
    SettleContext,
    SettleFailureContext,
    SettleResultContext,
    VerifyContext,
    VerifyFailureContext,
    VerifyResultContext,
)


class TestAbortResult:
    """Test AbortResult dataclass."""

    def test_should_store_reason(self) -> None:
        result = AbortResult(reason="user cancelled")
        assert result.reason == "user cancelled"

    def test_should_accept_empty_reason(self) -> None:
        result = AbortResult(reason="")
        assert result.reason == ""

    def test_equality_uses_reason(self) -> None:
        assert AbortResult(reason="r") == AbortResult(reason="r")
        assert AbortResult(reason="a") != AbortResult(reason="b")


class TestRecoveredPayloadResult:
    """Test RecoveredPayloadResult dataclass."""

    def test_should_store_payload(self) -> None:
        sentinel = MagicMock(name="payload")
        result = RecoveredPayloadResult(payload=sentinel)
        assert result.payload is sentinel

    def test_equality_uses_payload(self) -> None:
        payload = MagicMock(name="payload")
        assert RecoveredPayloadResult(payload=payload) == RecoveredPayloadResult(payload=payload)


class TestRecoveredVerifyResult:
    """Test RecoveredVerifyResult dataclass."""

    def test_should_store_result(self) -> None:
        sentinel = MagicMock(name="verify-response")
        result = RecoveredVerifyResult(result=sentinel)
        assert result.result is sentinel


class TestRecoveredSettleResult:
    """Test RecoveredSettleResult dataclass."""

    def test_should_store_result(self) -> None:
        sentinel = MagicMock(name="settle-response")
        result = RecoveredSettleResult(result=sentinel)
        assert result.result is sentinel


class TestVerifyContext:
    """Test VerifyContext dataclass."""

    def test_should_default_optional_byte_fields_to_none(self) -> None:
        payload = MagicMock(name="payload")
        requirements = MagicMock(name="requirements")

        ctx = VerifyContext(payment_payload=payload, requirements=requirements)

        assert ctx.payment_payload is payload
        assert ctx.requirements is requirements
        assert ctx.payload_bytes is None
        assert ctx.requirements_bytes is None

    def test_should_accept_explicit_byte_payloads(self) -> None:
        ctx = VerifyContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            payload_bytes=b"payload",
            requirements_bytes=b"requirements",
        )

        assert ctx.payload_bytes == b"payload"
        assert ctx.requirements_bytes == b"requirements"


class TestVerifyResultContext:
    """Test VerifyResultContext dataclass."""

    def test_should_store_result_when_provided(self) -> None:
        result = MagicMock(name="verify-response")
        ctx = VerifyResultContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            result=result,
        )
        assert ctx.result is result

    def test_should_inherit_optional_byte_fields(self) -> None:
        ctx = VerifyResultContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            result=MagicMock(),
        )
        assert ctx.payload_bytes is None
        assert ctx.requirements_bytes is None

    def test_should_raise_when_result_missing(self) -> None:
        with pytest.raises(ValueError, match="result is required"):
            VerifyResultContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
            )

    def test_should_raise_when_result_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="result is required"):
            VerifyResultContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
                result=None,
            )


class TestVerifyFailureContext:
    """Test VerifyFailureContext dataclass."""

    def test_should_store_error_when_provided(self) -> None:
        err = RuntimeError("boom")
        ctx = VerifyFailureContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            error=err,
        )
        assert ctx.error is err

    def test_should_inherit_optional_byte_fields(self) -> None:
        ctx = VerifyFailureContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            error=RuntimeError("boom"),
        )
        assert ctx.payload_bytes is None
        assert ctx.requirements_bytes is None

    def test_should_raise_when_error_missing(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            VerifyFailureContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
            )

    def test_should_raise_when_error_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            VerifyFailureContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
                error=None,
            )


class TestSettleContext:
    """Test SettleContext dataclass."""

    def test_should_default_optional_byte_fields_to_none(self) -> None:
        payload = MagicMock(name="payload")
        requirements = MagicMock(name="requirements")

        ctx = SettleContext(payment_payload=payload, requirements=requirements)

        assert ctx.payment_payload is payload
        assert ctx.requirements is requirements
        assert ctx.payload_bytes is None
        assert ctx.requirements_bytes is None

    def test_should_accept_explicit_byte_payloads(self) -> None:
        ctx = SettleContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            payload_bytes=b"p",
            requirements_bytes=b"r",
        )
        assert ctx.payload_bytes == b"p"
        assert ctx.requirements_bytes == b"r"


class TestSettleResultContext:
    """Test SettleResultContext dataclass."""

    def test_should_store_result_when_provided(self) -> None:
        result = MagicMock(name="settle-response")
        ctx = SettleResultContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            result=result,
        )
        assert ctx.result is result

    def test_should_raise_when_result_missing(self) -> None:
        with pytest.raises(ValueError, match="result is required"):
            SettleResultContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
            )

    def test_should_raise_when_result_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="result is required"):
            SettleResultContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
                result=None,
            )


class TestSettleFailureContext:
    """Test SettleFailureContext dataclass."""

    def test_should_store_error_when_provided(self) -> None:
        err = ValueError("settle failed")
        ctx = SettleFailureContext(
            payment_payload=MagicMock(),
            requirements=MagicMock(),
            error=err,
        )
        assert ctx.error is err

    def test_should_raise_when_error_missing(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            SettleFailureContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
            )

    def test_should_raise_when_error_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            SettleFailureContext(
                payment_payload=MagicMock(),
                requirements=MagicMock(),
                error=None,
            )


class TestPaymentCreationContext:
    """Test PaymentCreationContext dataclass."""

    def test_should_store_required_and_selected(self) -> None:
        required = MagicMock(name="payment-required")
        selected = MagicMock(name="selected-requirements")

        ctx = PaymentCreationContext(
            payment_required=required,
            selected_requirements=selected,
        )

        assert ctx.payment_required is required
        assert ctx.selected_requirements is selected


class TestPaymentCreatedContext:
    """Test PaymentCreatedContext dataclass."""

    def test_should_store_payment_payload_when_provided(self) -> None:
        payload = MagicMock(name="payment-payload")
        ctx = PaymentCreatedContext(
            payment_required=MagicMock(),
            selected_requirements=MagicMock(),
            payment_payload=payload,
        )
        assert ctx.payment_payload is payload

    def test_should_inherit_payment_required_and_selected(self) -> None:
        required = MagicMock(name="required")
        selected = MagicMock(name="selected")
        ctx = PaymentCreatedContext(
            payment_required=required,
            selected_requirements=selected,
            payment_payload=MagicMock(),
        )
        assert ctx.payment_required is required
        assert ctx.selected_requirements is selected

    def test_should_raise_when_payment_payload_missing(self) -> None:
        with pytest.raises(ValueError, match="payment_payload is required"):
            PaymentCreatedContext(
                payment_required=MagicMock(),
                selected_requirements=MagicMock(),
            )

    def test_should_raise_when_payment_payload_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="payment_payload is required"):
            PaymentCreatedContext(
                payment_required=MagicMock(),
                selected_requirements=MagicMock(),
                payment_payload=None,
            )


class TestPaymentCreationFailureContext:
    """Test PaymentCreationFailureContext dataclass."""

    def test_should_store_error_when_provided(self) -> None:
        err = RuntimeError("creation failed")
        ctx = PaymentCreationFailureContext(
            payment_required=MagicMock(),
            selected_requirements=MagicMock(),
            error=err,
        )
        assert ctx.error is err

    def test_should_inherit_payment_required_and_selected(self) -> None:
        required = MagicMock(name="required")
        selected = MagicMock(name="selected")
        ctx = PaymentCreationFailureContext(
            payment_required=required,
            selected_requirements=selected,
            error=RuntimeError("err"),
        )
        assert ctx.payment_required is required
        assert ctx.selected_requirements is selected

    def test_should_raise_when_error_missing(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            PaymentCreationFailureContext(
                payment_required=MagicMock(),
                selected_requirements=MagicMock(),
            )

    def test_should_raise_when_error_explicitly_none(self) -> None:
        with pytest.raises(ValueError, match="error is required"):
            PaymentCreationFailureContext(
                payment_required=MagicMock(),
                selected_requirements=MagicMock(),
                error=None,
            )
