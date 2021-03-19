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
      ethBalance: 0,
      balance: 0,
      txHash: '',
      status: ''
    }
  }
  componentDidMount() {
    this.initWeb3();
    this.initContract();
  }

  /**
   * 初始化web3
   */
  initWeb3 () {
    this.web3 = new Web3(window.ethereum);
  }

  /**
   * 初始化合约
   */
  initContract () {
    const contractAddress = '0xfa95506583310999dc823f45CaeD5faE3c2ED1b9';
    const contract = new this.web3.eth.Contract(abi, contractAddress);
    this.contract = contract;
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
   * 连接Meta Mask的以太坊账户
   * @returns {Promise<void>}
   */
  connect  = async () => {
    const accounts = await this.web3.eth.getAccounts();
    const account = accounts[0];
    this.setState({
      connected: true,
      account: account
    });
    this.fetchBalance(account);
  }
  onReceiverChange = (e) =>{
    const address = e.target.value;
    this.setState({
      receiverAddress: address
    })
  }
  onTransferAmountChange = (e) => {
    const amount = e.target.value;
    this.setState({
      transferAmount: amount
    })
  }
  onTransfer = () => {
    console.log('receiverAddress', this.state.receiverAddress);
    console.log('transferAmount', this.state.transferAmount);
    this.contract.methods.send(this.state.receiverAddress, this.state.transferAmount)
      .send({
        from: this.state.account
      })
      .on('transactionHash', (hash) => {
        // 交易广播到节点，等待打包
        this.setState({
          txHash: hash,
          status: 'pending',
        });
      })
      .on('confirmation', (confirmationNumber, receipt) => {
        // 交易已被确认
        this.setState({
          status: 'confirmed',
        });
      });
  }
  render() {
    return (
      <div className="App">
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
            ethBalance={this.state.ethBalance}
            balance={this.state.balance}
            account={this.state.account}
            txHash={this.state.txHash}
            status={this.state.status}
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
      <div>
        <h2>转账</h2>
        <div>
          <label>收款地址：</label>
          <input type='text' onChange={this.props.onReceiverChange}/>
        </div>
        <div>
          <label>转出数额：</label>
          <input type='number' onChange={this.props.onTransferAmountChange}/>
        </div>
        <button onClick={this.props.onTransfer}>确定转出</button>
      </div>
      {
        this.props.txHash && <div>
          <h2>记录</h2>
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
