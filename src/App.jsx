import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Grid, 
  Box,
  CircularProgress,
  Link,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Asset,
  Operation,
  LiquidityPoolAsset,
  getLiquidityPoolId,
  BASE_FEE,
  Networks
} from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  const [keypair, setKeypair] = useState(null);
  const [log, setLog] = useState('');
  const [liquidityPoolId, setLiquidityPoolId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [tokenAAmount, setTokenAAmount] = useState('');
  const [tokenBAmount, setTokenBAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState({
    generateKeypair: false,
    fundAccount: false,
    createLiquidityPool: false,
    withdrawFromPool: false
  });

  const addLog = (message) => {
    setLog(message);
    toast.info(message);
  };
  const generateKeypair = () => {
    setLoading(prev => ({ ...prev, generateKeypair: true }));
    const newKeypair = Keypair.random();
    setKeypair(newKeypair);
    addLog(`Generated new keypair. Public key: ${newKeypair.publicKey()}`);
    setLoading(prev => ({ ...prev, generateKeypair: false }));
  };

  const fundAccount = async () => {
    if (!keypair) {
      toast.error('Please generate a keypair first.');
      return;
    }

    setLoading(prev => ({ ...prev, fundAccount: true }));
    const friendbotUrl = `https://friendbot.stellar.org?addr=${keypair.publicKey()}`;
    try {
      const response = await fetch(friendbotUrl);
      if (response.ok) {
        toast.success(`Account ${keypair.publicKey()} successfully funded.`);
      } else {
        toast.error(`Something went wrong funding account: ${keypair.publicKey()}.`);
      }
    } catch (error) {
      toast.error(`Error funding account ${keypair.publicKey()}: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, fundAccount: false }));
  };

  const createLiquidityPool = async () => {
    if (!keypair || !assetName || !tokenAAmount || !tokenBAmount) {
      toast.error('Please ensure you have a keypair, asset name, and token amounts.');
      return;
    }

    setLoading(prev => ({ ...prev, createLiquidityPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const customAsset = new Asset(assetName, keypair.publicKey());
      const lpAsset = new LiquidityPoolAsset(Asset.native(), customAsset, 30);
      const lpId = getLiquidityPoolId('constant_product', lpAsset).toString('hex');
      setLiquidityPoolId(lpId);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.changeTrust({ asset: lpAsset }))
        .addOperation(Operation.liquidityPoolDeposit({
          liquidityPoolId: lpId,
          maxAmountA: tokenAAmount,
          maxAmountB: tokenBAmount,
          minPrice: { n: 1, d: 1 },
          maxPrice: { n: 1, d: 1 }
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      toast.success(<>Liquidity Pool created. <Link href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noopener noreferrer">View Transaction</Link></>);
    } catch (error) {
      toast.error(`Error creating Liquidity Pool: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, createLiquidityPool: false }));
  };

  const withdrawFromPool = async () => {
    if (!keypair || !liquidityPoolId || !withdrawAmount) {
      toast.error('Please ensure you have a keypair, liquidity pool ID, and withdrawal amount.');
      return;
    }

    setLoading(prev => ({ ...prev, withdrawFromPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.liquidityPoolWithdraw({
          liquidityPoolId: liquidityPoolId,
          amount: withdrawAmount,
          minAmountA: '0',
          minAmountB: '0'
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      toast.success(<>Withdrawal successful. <Link href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noopener noreferrer">View Transaction</Link></>);
    } catch (error) {
      toast.error(`Error withdrawing from Liquidity Pool: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, withdrawFromPool: false }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, p: 4, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Grid item xs container direction="column" spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3,  textAlign: 'center' }}>
                Manage Liquidity Pool
              </Typography>
              <Button 
                variant="contained" 
                onClick={generateKeypair} 
                fullWidth 
                disabled={loading.generateKeypair}
                sx={{ mb: 2, height: 48 }}
              >
                {loading.generateKeypair ? <CircularProgress size={24} /> : 'Generate Keypair'}
              </Button>
              <Button 
                variant="outlined" 
                onClick={fundAccount} 
                fullWidth 
                sx={{ mb: 3, height: 48 }}
                disabled={loading.fundAccount}
              >
                {loading.fundAccount ? <CircularProgress size={24} /> : 'Fund Account'}
              </Button>
              <TextField
                label="Asset Name"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <TextField
                label="Token A Amount (XLM)"
                value={tokenAAmount}
                onChange={(e) => setTokenAAmount(e.target.value)}
                fullWidth
                margin="normal"
                type="number"
                variant="outlined"
              />
              <TextField
                label="Token B Amount (Custom Asset)"
                value={tokenBAmount}
                onChange={(e) => setTokenBAmount(e.target.value)}
                fullWidth
                margin="normal"
                type="number"
                variant="outlined"
              />
              <Button 
                variant="contained" 
                onClick={createLiquidityPool} 
                fullWidth 
                sx={{ mt: 2, mb: 3, height: 48 }}
                disabled={loading.createLiquidityPool}
              >
                {loading.createLiquidityPool ? <CircularProgress size={24} /> : 'Create Liquidity Pool'}
              </Button>
              <TextField
                label="Liquidity Pool ID"
                value={liquidityPoolId}
                onChange={(e) => setLiquidityPoolId(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <TextField
                label="Withdraw Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                fullWidth
                margin="normal"
                type="number"
                variant="outlined"
              />
              <Button 
                variant="contained" 
                onClick={withdrawFromPool} 
                fullWidth 
                sx={{ mt: 2, height: 48 }}
                disabled={loading.withdrawFromPool}
              >
                {loading.withdrawFromPool ? <CircularProgress size={24} /> : 'Withdraw from Pool'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <ToastContainer theme="colored" />
    </ThemeProvider>
  );
}

export default App;
