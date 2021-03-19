import React from 'react';
import Web3 from 'web3'
import './App.css';
import abi from './abi.json';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      connected: false, // 是否连接meta mask
      account: '', // meta mask的以太坊账户
      minterAccount: '', // 铸币者的以太坊账户
      mintReceiverAddress: '', // 铸币的接收地址
      mintAmount: '', // 铸币数量
      ethBalance: 0, // 以太坊余额
      balance: 0, // 币余额
      txHash: '', // 广播的交易id
      status: '', // 交易状态
      netVersion: '' // network id
    }
  }
  /**
   * 初始化web3
   */
  async initWeb3 () {
    console.log('window.ethereum', window.ethereum)
    await window.ethereum.enable();
    this.web3 = new Web3(window.ethereum);
    window.ethereum.on('networkChanged',  () => {
      console.log('changed net')
      this.fetchNetworkId();
    });
    this.fetchNetworkId();
  }
  async fetchNetworkId () {
    const netVersion = await this.web3.eth.net.getId();
    console.log('netVersion', netVersion)
    this.setState({
      netVersion
    });
  }

  /**
   * 初始化合约
   */
  initContract () {
    const contractAddress = '0xfa95506583310999dc823f45CaeD5faE3c2ED1b9';
    const contract = new this.web3.eth.Contract(abi, contractAddress);
    this.contract = contract;
    this.initContractEvent();
  }

  /**
   * 监听转账事件，当监听到当前账户收到币后，刷新余额
   */
  initContractEvent () {
    this.contract.events.Sent({
      filter: {to: [this.state.account]},
      fromBlock: 0
    })
      .on('change', (event) => {
        this.fetchBalance(this.state.account)
      });
  }

  /**
   * 请求余额
   */
  async fetchBalance (account) {
    const balance = await this.contract.methods.balances(account).call();
    const ethBalance = await this.web3.eth.getBalance(account);
    console.log('ethBalance', ethBalance)
    this.setState({
      balance,
      ethBalance: Web3.utils.fromWei(ethBalance)
    })
  }

  /**
   * 请求铸币者地址
   */
  async fetchMinterAccount () {
    const minterAccount = await this.contract.methods.minter().call();
    this.setState({
      minterAccount,
    })
  }
  /**
   * 连接Meta Mask的以太坊账户
   * @returns {Promise<void>}
   */
  connect  = async () => {
    await this.initWeb3();
    this.initContract();

    const accounts = await this.web3.eth.getAccounts();
    console.log('accounts', accounts)
    const account = accounts[0];
    this.setState({
      connected: true,
      account: account
    });
    this.fetchBalance(account);
    this.fetchMinterAccount();
  }
  /**
   * 记录收款地址
   * @param e
   */
  onReceiverChange = (e) =>{
    const address = e.target.value;
    this.setState({
      receiverAddress: address
    })
  }
  /**
   * 记录转出数量
   * @param e
   */
  onTransferAmountChange = (e) => {
    const amount = e.target.value;
    this.setState({
      transferAmount: amount
    })
  }
  /**
   * 记录铸币的接收地址
   * @param e
   */
  onMintReceiverChange = (e) =>{
    const address = e.target.value;
    this.setState({
      mintReceiverAddress: address
    })
  }
  /**
   * 记录铸币数量
   * @param e
   */
  onMintAmountChange = (e) => {
    const amount = e.target.value;
    this.setState({
      mintAmount: amount
    })
  }
  /**
   * 铸币
   */
  onMint = () => {
    // 在此调用合约方法mint
    this.contract.methods.mint(this.state.mintReceiverAddress, this.state.mintAmount)
      .send({
        from: this.state.account
      })
      .on('transactionHash', (hash) => {
        // 交易广播到节点，等待打包
        this.setState({
          txHash: hash,
          status: 'pending',
          action: '铸币',
        });
      })
      .on('receipt', (receipt) => {
        // 交易已被确认
        this.setState({
          status: 'confirmed',
        });
        // 刷新余额信息
        this.fetchBalance(this.state.account);
      });
  }
  /**
   * 转账
   */
  onTransfer = () => {
    // 在此调用合约方法send
    console.log('transfer', this.state.receiverAddress, this.state.transferAmount, this.state.account)
    this.contract.methods.send(this.state.receiverAddress, this.state.transferAmount)
      .send({
        from: this.state.account
      })
      .on('transactionHash', (hash) => {
        // 交易广播到节点，等待打包
        this.setState({
          txHash: hash,
          status: 'pending',
          action: '转账',
        });
      })
      .on('receipt', (receipt) => {
        // 交易已被确认
        this.setState({
          status: 'confirmed',
        });
      });
  }
  render() {
    return (
      <div className="App">
        {
          this.state.netVersion && this.state.netVersion !== 42 &&
          <div className={'warn'}>
            链接的网络不正确<br/>
            请打开MetaMask切换至Kovan测试网络
          </div>
        }
        <header className="App-header">
          DApp Coin
        </header>
        {
          !this.state.connected && <button onClick={this.connect} className={'connectBtn'}>Connect MetaMask</button>
        }
        {
          this.state.connected && <DAppInfo
            onTransfer={this.onTransfer}
            onReceiverChange={this.onReceiverChange}
            onTransferAmountChange={this.onTransferAmountChange}
            onMint={this.onMint}
            onMintReceiverChange={this.onMintReceiverChange}
            onMintAmountChange={this.onMintAmountChange}
            ethBalance={this.state.ethBalance}
            balance={this.state.balance}
            account={this.state.account}
            action={this.state.action}
            txHash={this.state.txHash}
            status={this.state.status}
            isMinter={this.state.minterAccount === this.state.account}
          />
        }
      </div>
    );
  }
}

export default App;


class DAppInfo extends React.Component {
  render() {
    return <div className={'infoContainer'}>
      <div className={'infoItem'}>
        <label>账户地址：</label>
        <span>
          {
            this.props.account
          }
        </span>
      </div>
      <div className={'infoItem'}>
        <label>ETH余额：</label>
        <span>
          {
            this.props.ethBalance
          }
        </span>
      </div>
      <div className={'infoItem'}>
        <label>Coin余额：</label>
        <span>
          {
            this.props.balance
          }
        </span>
      </div>
      {
        this.props.isMinter &&  <div className={'transferCon'}>
          <h2>铸币</h2>
          <div className={'transferItem'}>
            <label>收币地址：</label>
            <input type='text' onChange={this.props.onMintReceiverChange}/>
          </div>
          <div className={'transferItem'}>
            <label>铸币数量：</label>
            <input type='number' onChange={this.props.onMintAmountChange}/>
          </div>
          <button onClick={this.props.onMint}>确定铸币</button>
        </div>
      }
      <div className={'transferCon'}>
        <h2>转账</h2>
        <div className={'transferItem'}>
          <label>收款地址：</label>
          <input type='text' onChange={this.props.onReceiverChange}/>
        </div>
        <div className={'transferItem'}>
          <label>转出数额：</label>
          <input type='number' onChange={this.props.onTransferAmountChange}/>
        </div>
        <button onClick={this.props.onTransfer}>确定转出</button>
      </div>
      {
        this.props.txHash && <div>
          <h2>记录</h2>
          <div>
            <label>交易动作：</label>
            <span>
            {
              this.props.action
            }
          </span>
          </div>
          <div>
            <label>交易哈希：</label>
            <span>
            {
              this.props.txHash
            }
          </span>
          </div>
          <div>
            <label>交易状态：</label>
            <span>
            {
              this.props.status
            }
          </span>
          </div>
        </div>
      }
    </div>
  }
}
