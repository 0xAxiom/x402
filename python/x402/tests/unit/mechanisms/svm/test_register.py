"""Unit tests for SVM exact register helpers."""

from unittest.mock import MagicMock

import pytest

try:
    from solders.keypair import Keypair
except ImportError:
    pytest.skip("SVM register helpers require solders", allow_module_level=True)

from x402 import (
    x402Client,
    x402ClientSync,
    x402Facilitator,
    x402FacilitatorSync,
    x402ResourceServer,
    x402ResourceServerSync,
)
from x402.mechanisms.svm.constants import V1_NETWORKS
from x402.mechanisms.svm.exact import (
    ExactSvmClientScheme,
    ExactSvmFacilitatorScheme,
    ExactSvmServerScheme,
)
from x402.mechanisms.svm.exact.register import (
    register_exact_svm_client,
    register_exact_svm_facilitator,
    register_exact_svm_server,
)
from x402.mechanisms.svm.exact.v1.client import ExactSvmSchemeV1 as ExactSvmClientSchemeV1
from x402.mechanisms.svm.exact.v1.facilitator import (
    ExactSvmSchemeV1 as ExactSvmFacilitatorSchemeV1,
)
from x402.mechanisms.svm.settlement_cache import SettlementCache
from x402.mechanisms.svm.signers import KeypairSigner

# =============================================================================
# Test fixtures
# =============================================================================


def _make_client_signer():
    """Build a minimal SVM client signer for tests."""
    return KeypairSigner(Keypair())


def _make_facilitator_signer():
    """Build a stand-in object satisfying FacilitatorSvmSigner for tests.

    The register helpers only store the signer reference on the scheme
    instance — no signer methods are invoked, so a Mock is sufficient.
    """
    signer = MagicMock()
    signer.get_addresses.return_value = ["FeePayer1111111111111111111111111111"]
    return signer


# =============================================================================
# register_exact_svm_client
# =============================================================================


class TestRegisterExactSvmClient:
    """Tests for register_exact_svm_client."""

    def test_should_return_client_for_chaining(self):
        """Helper must return the same client instance."""
        client = x402Client()
        signer = _make_client_signer()

        result = register_exact_svm_client(client, signer)

        assert result is client

    def test_should_register_v2_wildcard_by_default(self):
        """Default registration adds solana:* V2 scheme."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(client, signer)

        registered = client.get_registered_schemes()
        v2_entries = registered[2]
        assert any(
            entry["network"] == "solana:*" and entry["scheme"] == "exact" for entry in v2_entries
        )

    def test_should_register_all_v1_networks_by_default(self):
        """All V1_NETWORKS entries are registered as V1 schemes."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(client, signer)

        registered = client.get_registered_schemes()
        v1_networks = {entry["network"] for entry in registered[1]}
        for network in V1_NETWORKS:
            assert network in v1_networks
        for entry in registered[1]:
            assert entry["scheme"] == "exact"

    def test_should_register_specific_network_when_str(self):
        """Passing a single network string registers only that V2 entry."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(
            client, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        v2_entries = client.get_registered_schemes()[2]
        assert len(v2_entries) == 1
        assert v2_entries[0]["network"] == "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        assert v2_entries[0]["scheme"] == "exact"

    def test_should_register_each_network_in_list(self):
        """Passing a list registers a V2 entry per network."""
        client = x402Client()
        signer = _make_client_signer()
        networks = [
            "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        ]

        register_exact_svm_client(client, signer, networks=networks)

        v2_networks = {entry["network"] for entry in client.get_registered_schemes()[2]}
        assert v2_networks == set(networks)

    def test_should_not_register_wildcard_when_networks_provided(self):
        """Explicit networks suppress the wildcard fallback."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(
            client, signer, networks=["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]
        )

        v2_networks = {entry["network"] for entry in client.get_registered_schemes()[2]}
        assert "solana:*" not in v2_networks

    def test_should_register_v1_networks_even_when_v2_networks_provided(self):
        """V1 registration is independent of the V2 networks argument."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(
            client, signer, networks=["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]
        )

        v1_networks = {entry["network"] for entry in client.get_registered_schemes()[1]}
        for network in V1_NETWORKS:
            assert network in v1_networks

    def test_should_register_provided_policies(self):
        """Provided policies are appended to the client policy list."""
        client = x402Client()
        signer = _make_client_signer()
        policy_a = MagicMock(name="policy_a")
        policy_b = MagicMock(name="policy_b")

        register_exact_svm_client(client, signer, policies=[policy_a, policy_b])

        assert policy_a in client._policies
        assert policy_b in client._policies

    def test_should_not_add_policies_when_none(self):
        """Omitting policies leaves the policy list untouched."""
        client = x402Client()
        signer = _make_client_signer()
        before = list(client._policies)

        register_exact_svm_client(client, signer)

        assert client._policies == before

    def test_should_attach_svm_client_scheme_instance(self):
        """Registered V2 scheme is an ExactSvmClientScheme bound to the signer."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(
            client, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        scheme = client._schemes["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]["exact"]
        assert isinstance(scheme, ExactSvmClientScheme)
        assert scheme._signer is signer

    def test_should_attach_svm_v1_client_scheme_instance(self):
        """Registered V1 scheme is an ExactSvmClientSchemeV1 bound to the signer."""
        client = x402Client()
        signer = _make_client_signer()

        register_exact_svm_client(client, signer)

        v1_scheme = client._schemes_v1["solana"]["exact"]
        assert isinstance(v1_scheme, ExactSvmClientSchemeV1)
        assert v1_scheme._signer is signer

    def test_should_propagate_rpc_url_to_v2_and_v1(self):
        """rpc_url argument should reach both the V2 and V1 client schemes."""
        client = x402Client()
        signer = _make_client_signer()
        custom_rpc = "https://custom-rpc.example.com"

        register_exact_svm_client(
            client,
            signer,
            networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            rpc_url=custom_rpc,
        )

        v2_scheme = client._schemes["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]["exact"]
        v1_scheme = client._schemes_v1["solana"]["exact"]
        assert v2_scheme._custom_rpc_url == custom_rpc
        assert v1_scheme._custom_rpc_url == custom_rpc

    def test_should_work_with_sync_client(self):
        """Helper accepts x402ClientSync as well as x402Client."""
        client = x402ClientSync()
        signer = _make_client_signer()

        result = register_exact_svm_client(client, signer)

        assert result is client
        v2_networks = {entry["network"] for entry in client.get_registered_schemes()[2]}
        assert "solana:*" in v2_networks


# =============================================================================
# register_exact_svm_server
# =============================================================================


class TestRegisterExactSvmServer:
    """Tests for register_exact_svm_server."""

    def test_should_return_server_for_chaining(self):
        """Helper must return the same server instance."""
        server = x402ResourceServer(MagicMock())

        result = register_exact_svm_server(server)

        assert result is server

    def test_should_register_v2_wildcard_by_default(self):
        """Default registration uses the solana:* wildcard."""
        server = x402ResourceServer(MagicMock())

        register_exact_svm_server(server)

        assert "solana:*" in server._schemes
        assert "exact" in server._schemes["solana:*"]

    def test_should_register_specific_network_when_str(self):
        """Passing a single network string registers exactly that network."""
        server = x402ResourceServer(MagicMock())

        register_exact_svm_server(server, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")

        assert "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" in server._schemes
        assert "solana:*" not in server._schemes

    def test_should_register_each_network_in_list(self):
        """Passing a list registers each network."""
        server = x402ResourceServer(MagicMock())
        networks = [
            "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        ]

        register_exact_svm_server(server, networks=networks)

        for network in networks:
            assert network in server._schemes
            assert "exact" in server._schemes[network]

    def test_should_attach_svm_server_scheme_instance(self):
        """Registered scheme should be an ExactSvmServerScheme."""
        server = x402ResourceServer(MagicMock())

        register_exact_svm_server(server, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")

        scheme = server._schemes["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]["exact"]
        assert isinstance(scheme, ExactSvmServerScheme)

    def test_should_not_register_v1_schemes(self):
        """Server registration is V2 only — no V1 entries should be added."""
        server = x402ResourceServer(MagicMock())

        register_exact_svm_server(server)

        assert not any(network in V1_NETWORKS for network in server._schemes.keys())

    def test_should_work_with_sync_server(self):
        """Helper accepts x402ResourceServerSync as well as x402ResourceServer."""
        server = x402ResourceServerSync(MagicMock())

        result = register_exact_svm_server(server)

        assert result is server
        assert "solana:*" in server._schemes


# =============================================================================
# register_exact_svm_facilitator
# =============================================================================


class TestRegisterExactSvmFacilitator:
    """Tests for register_exact_svm_facilitator."""

    def test_should_return_facilitator_for_chaining(self):
        """Helper must return the same facilitator instance."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        result = register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        assert result is facilitator

    def test_should_register_specific_network_when_str(self):
        """A network string should register that single network."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        v2_networks = set()
        for scheme_data in facilitator._schemes:
            v2_networks |= scheme_data.networks
        assert v2_networks == {"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"}

    def test_should_register_each_network_in_list(self):
        """A list of networks should register all of them under one V2 entry."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()
        networks = [
            "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        ]

        register_exact_svm_facilitator(facilitator, signer, networks=networks)

        v2_networks = set()
        for scheme_data in facilitator._schemes:
            v2_networks |= scheme_data.networks
        assert v2_networks == set(networks)

    def test_should_register_v1_for_all_v1_networks(self):
        """V1 registration always covers every V1_NETWORKS entry."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        v1_networks = set()
        for scheme_data in facilitator._schemes_v1:
            v1_networks |= scheme_data.networks
        assert v1_networks == set(V1_NETWORKS)

    def test_should_attach_svm_facilitator_scheme_instance(self):
        """Registered V2 facilitator should be ExactSvmFacilitatorScheme bound to signer."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        assert len(facilitator._schemes) == 1
        scheme = facilitator._schemes[0].facilitator
        assert isinstance(scheme, ExactSvmFacilitatorScheme)
        assert scheme._signer is signer

    def test_should_attach_svm_v1_facilitator_scheme_instance(self):
        """Registered V1 facilitator should be ExactSvmFacilitatorSchemeV1 bound to signer."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        assert len(facilitator._schemes_v1) == 1
        v1_scheme = facilitator._schemes_v1[0].facilitator
        assert isinstance(v1_scheme, ExactSvmFacilitatorSchemeV1)
        assert v1_scheme._signer is signer

    def test_should_share_settlement_cache_between_v2_and_v1(self):
        """V2 and V1 facilitator schemes must share a single SettlementCache."""
        facilitator = x402Facilitator()
        signer = _make_facilitator_signer()

        register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        v2_scheme = facilitator._schemes[0].facilitator
        v1_scheme = facilitator._schemes_v1[0].facilitator
        assert isinstance(v2_scheme._settlement_cache, SettlementCache)
        assert v2_scheme._settlement_cache is v1_scheme._settlement_cache

    def test_should_create_independent_settlement_cache_per_call(self):
        """Each call creates its own SettlementCache (no global sharing across registrations)."""
        signer_a = _make_facilitator_signer()
        signer_b = _make_facilitator_signer()
        facilitator_a = x402Facilitator()
        facilitator_b = x402Facilitator()

        register_exact_svm_facilitator(
            facilitator_a, signer_a, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )
        register_exact_svm_facilitator(
            facilitator_b, signer_b, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        cache_a = facilitator_a._schemes[0].facilitator._settlement_cache
        cache_b = facilitator_b._schemes[0].facilitator._settlement_cache
        assert cache_a is not cache_b

    def test_should_work_with_sync_facilitator(self):
        """Helper accepts x402FacilitatorSync as well as x402Facilitator."""
        facilitator = x402FacilitatorSync()
        signer = _make_facilitator_signer()

        result = register_exact_svm_facilitator(
            facilitator, signer, networks="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
        )

        assert result is facilitator
        v2_networks = set()
        for scheme_data in facilitator._schemes:
            v2_networks |= scheme_data.networks
        assert v2_networks == {"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"}
