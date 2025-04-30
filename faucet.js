require('dotenv').config();
const { ethers } = require('ethers');

const FAUCET_CONTRACT = '0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419';
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const ABI = ['function claim() external'];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = (color, msg) => console.log(`${COLORS[color] || ''}${msg}${COLORS.reset}`);

async function claim(walletPk, index) {
  const wallet = new ethers.Wallet(walletPk, provider);
  const contract = new ethers.Contract(FAUCET_CONTRACT, ABI, wallet);
  const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  log('cyan', `🚰 开始领取 - 钱包 #${index + 1}: ${shortAddr}`);

  try {
    // 查询实时 gasPrice
    const gasPrice = await provider.getGasPrice();
    const boostedGasPrice = gasPrice.mul(110).div(100); // 加速 10%

    // 预估 gasLimit
    const estimatedGas = await contract.estimateGas.claim();
    const gasLimit = estimatedGas.mul(120).div(100); // 加 20% 安全余量

    log('yellow', `⛽ 预估 gasLimit: ${estimatedGas.toString()}, 调整后 gasLimit: ${gasLimit.toString()}`);

    const tx = await contract.claim({
      gasLimit,
      gasPrice: boostedGasPrice,
    });

    log('yellow', `⛽ 交易已发送: ${tx.hash}`);
    const receipt = await tx.wait();
    log('green', `✅ 成功领取水！区块: ${receipt.blockNumber}`);
  } catch (err) {
    log('red', `❌ 领取失败: ${err.message || err}`);
  }
}

async function main() {
  const wallets = [];
  let i = 1;
  while (process.env[`WALLET_PK_${i}`]) {
    wallets.push(process.env[`WALLET_PK_${i}`]);
    i++;
  }

  if (wallets.length === 0) {
    log('red', '❌ 未找到钱包私钥，请检查 .env 文件是否正确配置');
    return;
  }

  const batchSize = 50; // 每批同时跑 50 个

  for (let i = 0; i < wallets.length; i += batchSize) {
    const batch = wallets.slice(i, i + batchSize);
    log('yellow', `🚀 批次 ${Math.floor(i / batchSize) + 1} 开始`);

    await Promise.all(batch.map((walletPk, index) => claim(walletPk, i + index)));
  }

  log('green', '\n🎉 所有钱包 Faucet 领取流程完成');
}

main();
