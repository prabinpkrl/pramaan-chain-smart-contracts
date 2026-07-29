import { expect } from "@playwright/test";

export const ADDRESSES = {
  admin: "0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447",
  issuer: "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  citizen: "0x1234567890123456789012345678901234567890",
};

export const HASHES = {
  active: `0x${"a".repeat(64)}`,
  revoked: "0x6a1c557dab491820c0c90770d46d60f06c809a76cd0b1afa9691be0397d4ab6d",
};

export function sessionFor(role) {
  const common = {
    csrfToken: "e2e-csrf-token",
    roles: [role],
    issuerMemberships: [],
    citizenRelationships: [],
  };

  if (role === "ADMIN") return { ...common, address: ADDRESSES.admin };
  if (role === "ISSUER") {
    return {
      ...common,
      address: ADDRESSES.issuer,
      issuerMemberships: [{
        id: "institution-1",
        name: "Tribhuvan University",
        publicId: "TU-NEPAL",
      }],
    };
  }
  if (role === "CITIZEN") {
    return {
      ...common,
      address: ADDRESSES.citizen,
      citizenRelationships: [{
        id: "relationship-1",
        name: "Tribhuvan University",
        publicId: "TU-NEPAL",
      }],
    };
  }
  return { ...common, address: ADDRESSES.citizen, roles: ["UNLINKED"] };
}

export async function installWallet(page, {
  address = ADDRESSES.admin,
  chainId = "0x1",
  connected = false,
} = {}) {
  await page.addInitScript(({ account, initialChain, initiallyConnected }) => {
    const listeners = new Map();
    const state = {
      account,
      chainId: initialChain,
      connected: initiallyConnected,
    };
    const emit = (event, value) => {
      for (const handler of listeners.get(event) || []) handler(value);
    };
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === "eth_accounts") return state.connected ? [state.account] : [];
        if (method === "eth_requestAccounts") {
          state.connected = true;
          emit("accountsChanged", [state.account]);
          return [state.account];
        }
        if (method === "eth_chainId") return state.chainId;
        if (method === "eth_getBalance") return "0xde0b6b3a7640000";
        if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
          state.chainId = "0xaa36a7";
          emit("chainChanged", state.chainId);
          return null;
        }
        if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
        if (method === "personal_sign") return `0x${"1".repeat(130)}`;
        throw Object.assign(new Error(`Unsupported E2E wallet method: ${method}`), { code: -32601 });
      },
      on: (event, handler) => {
        const handlers = listeners.get(event) || [];
        handlers.push(handler);
        listeners.set(event, handlers);
      },
      removeListener: (event, handler) => {
        listeners.set(event, (listeners.get(event) || []).filter((item) => item !== handler));
      },
    };
  }, { account: address, initialChain: chainId, initiallyConnected: connected });
}

export async function installMultipleWallets(page) {
  await page.addInitScript(({ addresses }) => {
    const makeProvider = (account, flags = {}) => {
      const listeners = new Map();
      const state = {
        account,
        chainId: "0x1",
        connected: false,
      };
      const emit = (event, value) => {
        for (const handler of listeners.get(event) || []) handler(value);
      };

      return {
        ...flags,
        request: async ({ method }) => {
          if (method === "eth_accounts") return state.connected ? [state.account] : [];
          if (method === "eth_requestAccounts") {
            state.connected = true;
            emit("accountsChanged", [state.account]);
            return [state.account];
          }
          if (method === "eth_chainId") return state.chainId;
          if (method === "eth_getBalance") return "0x0";
          if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
            state.chainId = "0xaa36a7";
            emit("chainChanged", state.chainId);
            return null;
          }
          if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
          if (method === "personal_sign") return `0x${"2".repeat(130)}`;
          throw Object.assign(new Error(`Unsupported E2E wallet method: ${method}`), { code: -32601 });
        },
        on: (event, handler) => {
          const handlers = listeners.get(event) || [];
          handlers.push(handler);
          listeners.set(event, handlers);
        },
        removeListener: (event, handler) => {
          listeners.set(event, (listeners.get(event) || []).filter((item) => item !== handler));
        },
      };
    };

    const metamask = makeProvider(addresses.admin, { isMetaMask: true });
    const rabby = makeProvider(addresses.issuer, { isRabby: true });
    const announcements = [
      {
        info: {
          uuid: "e2e-metamask",
          name: "MetaMask",
          icon: "",
          rdns: "io.metamask",
        },
        provider: metamask,
      },
      {
        info: {
          uuid: "e2e-rabby",
          name: "Rabby Wallet",
          icon: "",
          rdns: "io.rabby",
        },
        provider: rabby,
      },
    ];

    window.ethereum = metamask;
    window.addEventListener("eip6963:requestProvider", () => {
      for (const detail of announcements) {
        window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
      }
    });
  }, { addresses: ADDRESSES });
}

function verification(status = "ACTIVE") {
  return {
    status,
    issuer: ADDRESSES.issuer,
    issuedAt: 1784625444,
    revokedAt: status === "REVOKED" ? 1784625456 : 0,
    transactionHash: `0x${"7".repeat(64)}`,
  };
}

export async function mockApis(page, {
  role = null,
  verifyStatus = "ACTIVE",
  initialSession = role ? sessionFor(role) : null,
  signInRole = "ADMIN",
  institutions = [{
    id: "institution-1",
    name: "Tribhuvan University",
    publicId: "TU-NEPAL",
    issuerAddress: ADDRESSES.issuer,
    authorized: true,
  }],
} = {}) {
  await page.route("http://localhost:4000/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname === "/api/auth/session") {
      if (!initialSession) {
        return route.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED", message: "No session" } } });
      }
      return route.fulfill({ json: initialSession });
    }
    if (pathname === "/api/auth/nonce") {
      return route.fulfill({ json: { message: "localhost:5173 wants you to sign in with your Ethereum account" } });
    }
    if (pathname === "/api/auth/verify") return route.fulfill({ json: sessionFor(signInRole) });
    if (pathname === "/api/auth/logout") return route.fulfill({ json: { ok: true } });
    if (pathname === "/api/admin/institutions") {
      return route.fulfill({
        json: { institutions },
      });
    }
    if (pathname === "/api/issuer/requests") {
      return route.fulfill({
        json: {
          requests: [
            {
              id: "request-pending",
              certificateType: "Bachelor Transcript",
              status: "PENDING",
              createdAt: "2026-07-28T00:00:00.000Z",
            },
            {
              id: "request-processing",
              certificateType: "Migration Certificate",
              status: "PROCESSING",
              createdAt: "2026-07-27T00:00:00.000Z",
              documentHash: HASHES.active,
              attemptId: "attempt-1",
            },
          ],
        },
      });
    }
    if (pathname === "/api/issuer/certificates") {
      return route.fulfill({
        json: {
          certificates: [{
            id: "certificate-1",
            institutionName: "Tribhuvan University",
            certificateType: "Bachelor Transcript",
            documentHash: HASHES.active,
            issuer: ADDRESSES.issuer,
            issuedAt: "2026-07-28T00:00:00.000Z",
            status: "ACTIVE",
          }],
        },
      });
    }
    if (pathname === "/api/citizen/institutions") {
      return route.fulfill({
        json: { institutions: [{ id: "institution-1", name: "Tribhuvan University", publicId: "TU-NEPAL" }] },
      });
    }
    if (pathname === "/api/citizen/requests") {
      return route.fulfill({
        json: {
          requests: [{
            id: "request-1",
            institutionName: "Tribhuvan University",
            certificateType: "Bachelor Transcript",
            status: "PENDING",
            createdAt: "2026-07-28T00:00:00.000Z",
          }],
        },
      });
    }
    if (pathname === "/api/citizen/certificates") {
      return route.fulfill({
        json: {
          certificates: [{
            id: "certificate-1",
            institutionName: "Tribhuvan University",
            certificateType: "Bachelor Transcript",
            documentHash: HASHES.active,
            issuedAt: "2026-07-28T00:00:00.000Z",
            status: "ACTIVE",
          }],
        },
      });
    }
    return route.fulfill({ json: { ok: true } });
  });

  await page.route("http://localhost:3000/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.startsWith("/api/verify/")) return route.fulfill({ json: verification(verifyStatus) });
    if (pathname === "/api/health") {
      return route.fulfill({
        json: {
          status: "ok",
          chainId: 11155111,
          blockNumber: 12345678,
          issuerAddress: ADDRESSES.issuer,
          index: { status: "ready", lastIndexedBlock: 12345678 },
        },
      });
    }
    if (pathname === "/api/certificates") {
      return route.fulfill({
        json: {
          summary: { total: 12, active: 10, revoked: 2 },
          certificates: [],
        },
      });
    }
    if (pathname === "/api/events/transformed") {
      return route.fulfill({
        json: {
          events: [{
            type: "issuance",
            documentHash: HASHES.active,
            blockNumber: 12345678,
            timestamp: 1785196800,
            transactionHash: `0x${"8".repeat(64)}`,
          }],
        },
      });
    }
    if (pathname.startsWith("/api/issuer/")) {
      return route.fulfill({ json: { address: ADDRESSES.issuer, authorized: true } });
    }
    return route.fulfill({ json: {} });
  });
}

export async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.body.clientWidth,
    scrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}
