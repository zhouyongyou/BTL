# BitLuck DApp - AI 驅動的現代化 DeFi 平台

歡迎來到 BitLuck DApp！這是一個整合了 AI 功能的現代化去中心化應用程式 (DApp) 前端範本，旨在為用戶提供即時的鏈上數據儀表板、智慧互動工具以及清晰的專案資訊。

**[觀看線上 Demo](https://github.com/zhouyongyou/BTL/)**

---

## ✨ 主要功能

* **多功能代幣儀表板**:
    * **即時價格**: 透過 DexScreener API 顯示代幣的最新美金價格。
    * **市值計算**: 自動計算並顯示代幣的總市值。
    * **用戶資產**: 連接錢包後，即時顯示用戶持有的代幣餘額及其等值美金。
    * **代幣資訊**: 顯示代幣的總供應量。
    * **即時刷新**: 提供一鍵刷新功能，隨時獲取最新的鏈上數據。

* **智慧 AI 助理**:
    * **推薦訊息產生器**: 整合 Google Gemini API，用戶只需一鍵即可產生具有說服力、適合在社群媒體分享的個人化推薦訊息。

* **透明的專案藍圖 (Roadmap)**:
    * 以視覺化的時間軸展示專案的發展階段，包含「已完成」、「進行中」和「規劃中」，有效提升社群信心。

* **流暢的錢包體驗**:
    * 使用 Web3Modal 提供對多種錢包（如 MetaMask, WalletConnect）的支援。
    * 自動偵測並提示用戶切換至正確的 BSC 網路。
    * 即時監聽帳號和網路的變更。

* **國際化支援**:
    * 內建中/英雙語切換功能，方便不同地區的用戶使用。

---

## 🚀 技術棧

本專案採用了輕量級且高效的技術組合，在沒有大型前端框架的情況下實現了現代化的功能與體驗。

* **前端**: HTML5, CSS3, JavaScript (ES6+)
* **CSS 框架**: [Tailwind CSS](https://tailwindcss.com/) - 用於快速建構響應式且美觀的介面。
* **Web3 互動**:
    * [Web3.js](https://web3js.readthedocs.io/): 與以太坊區塊鏈進行互動的核心函式庫。
    * [Web3Modal](https://github.com/Web3Modal/web3modal): 提供一個簡單易用的多錢包連接介面。
* **數據 API**:
    * [DexScreener API](https://dexscreener.com/docs): 用於獲取代幣的即時價格數據。
    * [Google Gemini API](https://ai.google.dev/): 用於驅動 AI 智慧訊息產生器。
* **字體**: [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)

---

## 🛠️ 設定與配置

在部署或使用此專案前，請務必修改 `index.html` 檔案中 `<script>` 區塊內的 `State` 物件，以符合您的專案設定。

```javascript
const State = {
    // ... 其他設定 ...

    // 您的 BTL 代幣合約地址
    CONTRACT_ADDRESS: "0xb1b8ea6e684603f328ed401426c465f55d064444",

    // !!! 非常重要 !!!
    // 請替換成您代幣在 PancakeSwap 或其他 DEX 上的「交易對地址 (Pair Address)」
    // 這個地址用於獲取價格
    PAIR_ADDRESS: "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16", // 範例: WBNB/BUSD

    // ... 其他設定 ...
};
```

---

## 📂 專案結構

此專案目前為了方便預覽，將所有 HTML, CSS, JavaScript 都整合在單一的 `index.html` 檔案中。在正式開發中，建議將其拆分為獨立檔案以利於維護：

* `index.html`: 主要 HTML 結構。
* `style.css`: 存放所有 CSS 樣式。
* `script.js`: 存放所有 JavaScript 邏輯。

---

## 🚀 如何運行與部署

### 在本地運行

1.  直接在您的電腦上用任何現代瀏覽器（如 Chrome, Firefox, Edge）打開 `index.html` 檔案即可。

### 部署到 GitHub Pages

1.  確保您的專案已經上傳到 GitHub 儲存庫。
2.  在您的儲存庫頁面，點擊 **Settings** > **Pages**。
3.  在 "Build and deployment" 下的 "Source" 選項，選擇 **Deploy from a branch**。
4.  在 "Branch" 選項，選擇 `main` (或您的主分支)，資料夾選擇 `/ (root)`，然後點擊 **Save**。
5.  等待幾分鐘後，您的 DApp 就會成功部署，您可以在上方的網址中找到您的網站。

---

## 展望未來

這個專案為一個功能豐富的 DApp 打下了堅實的基礎。未來的擴展方向可以包括：

* **FAQ 區塊**: 新增常見問題解答，降低新用戶的入門門檻。
* **質押 (Staking) 功能**: 允許用戶質押代幣以賺取獎勵。
* **DAO 治理**: 建立一個去中心化自治組織，讓社群參與專案決策。
