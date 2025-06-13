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
const { depositBNB, __setContract, __setWeb3, __setUpdateUserInfo } = script;

describe('depositBNB', () => {
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
    global.contract = {
      methods: {
        depositBNB: jest.fn(() => ({
          send: jest.fn().mockResolvedValue()
        }))
      }
    };
    global.web3 = { utils: { toWei: jest.fn() } };
    __setContract(global.contract);
    __setWeb3(global.web3);
    global.userAccount = '0xabc';
  });

  test('rejects deposits below 0.02 BNB', async () => {
    document.getElementById('depositAmount').value = '0.01';
    document.getElementById('referrer').value = '';
    await depositBNB();
    expect(document.getElementById('toast').innerText).toBe('最低存入 0.02 BNB');
    expect(global.contract.methods.depositBNB).not.toHaveBeenCalled();
  });

    test('allows valid deposits and updates user info', async () => {
    document.getElementById('depositAmount').value = '0.05';
    document.getElementById('referrer').value = '';
    await depositBNB();
    expect(global.contract.methods.depositBNB).toHaveBeenCalled();
    expect(global.updateUserInfo).toHaveBeenCalled();
  });
});
