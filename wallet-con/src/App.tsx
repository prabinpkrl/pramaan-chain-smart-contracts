import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LinkIcon from "@mui/icons-material/Link";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ConnectKitButton } from "connectkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

const chainNames: Record<number, string> = {
  [mainnet.id]: "Ethereum Mainnet",
  [sepolia.id]: "Sepolia Testnet",
};

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at top, rgba(129, 140, 248, 0.15), transparent 50%), radial-gradient(ellipse at bottom, rgba(192, 132, 252, 0.1), transparent 50%), #0b0b12",
        px: 2,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(129, 140, 248, 0.12)",
                color: "primary.main",
              }}
            >
              <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
            </Box>

            <Stack spacing={1}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                Web3 Wallet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect your wallet to manage assets on Ethereum and Sepolia.
              </Typography>
            </Stack>

            <Box
              sx={{
                "& button": {
                  fontFamily: "inherit",
                },
              }}
            >
              <ConnectKitButton />
            </Box>

            {isConnected && address && (
              <>
                <Divider flexItem />
                <Stack spacing={2} sx={{ width: "100%" }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LinkIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Connected
                    </Typography>
                  </Stack>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "rgba(255, 255, 255, 0.02)",
                      borderColor: "divider",
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Address
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 500,
                          }}
                        >
                          {truncateAddress(address)}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Network
                        </Typography>
                        <Chip
                          label={chainNames[chainId] ?? `Chain ${chainId}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>

                      {balance && (
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Balance
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {parseFloat(balance.formatted).toFixed(4)}{" "}
                            {balance.symbol}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
