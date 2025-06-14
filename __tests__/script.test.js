// Set up minimal globals for script.js
global.window = Object.assign(global.window || {}, {
  WalletConnectProvider: { default: {} },
  Web3Modal: { default: class {} }
});
global.localStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn()
};
global.window.localStorage = global.localStorage;

const script = require('../script');
const { depositBTL, __setContract, __setWeb3, __setUpdateUserInfo } = script;

describe('depositBTL', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="depositAmount" />
      <input id="referrer" />
      <button id="depositBtn" data-loading="false"></button>
      <div id="toast"></div>
    `;
    // Stub helper functions
    global.showLoading = jest.fn();
    global.hideLoading = jest.fn();
    global.updateUserInfo = jest.fn();
    __setUpdateUserInfo(global.updateUserInfo);
    global.depositContract = {
      methods: {
        depositBTL: jest.fn(() => ({
          send: jest.fn().mockResolvedValue()
        }))
      }
    };
    global.web3 = { utils: { toWei: jest.fn() } };
    __setContract(global.depositContract);
    __setWeb3(global.web3);
    global.userAccount = '0xabc';
  });

  test('rejects zero deposits', async () => {
    document.getElementById('depositAmount').value = '0.01';
    document.getElementById('referrer').value = '';
    await depositBTL();
    expect(document.getElementById('toast').innerText).toBe('请输入存款数量');
    expect(global.depositContract.methods.depositBTL).not.toHaveBeenCalled();
  });

    test('allows valid deposits and updates user info', async () => {
    document.getElementById('depositAmount').value = '0.05';
    document.getElementById('referrer').value = '';
    await depositBTL();
    expect(global.depositContract.methods.depositBTL).toHaveBeenCalled();
    expect(global.updateUserInfo).toHaveBeenCalled();
  });
});
