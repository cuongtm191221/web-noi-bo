# BÀN GIAO NGỮ CẢNH HOÀN CHỈNH  
# FACEBOOK AUTO PUBLISHER LOCAL — n8n + CLAUDE CODE + META GRAPH API

> **Cập nhật đến ngày 17/07/2026**  
> Tài liệu này hợp nhất toàn bộ nội dung của tài liệu bàn giao trước và toàn bộ phần triển khai tiếp theo trong phiên làm việc hiện tại.  
> Mục đích: có thể mở một cuộc hội thoại mới và tiếp tục dự án mà không cần đọc lại lịch sử cũ.

---

## 0. CÁCH DÙNG TÀI LIỆU NÀY TRONG CUỘC HỘI THOẠI MỚI

Khi bắt đầu cuộc trò chuyện mới:

1. Tải file này lên.
2. Nói với trợ lý:
   > Hãy đọc toàn bộ tài liệu bàn giao này. Tiếp tục hướng dẫn tôi từng bước nhỏ, chỉ chuyển sang bước tiếp theo sau khi tôi xác nhận bước hiện tại đã thành công.
3. Không gửi Page Access Token vào chat.
4. Không yêu cầu làm lại các phần đã hoàn thành trong tài liệu.
5. Trước khi sửa workflow, phải phân biệt rõ:
   - luồng production;
   - luồng test cũ đã ngắt kết nối;
   - luồng sản phẩm đã đăng nhưng còn sót trong `inbox`;
   - luồng sản phẩm mới đăng thành công.

---

# PHẦN I — MỤC TIÊU VÀ PHẠM VI

## 1. Mục tiêu hệ thống

Xây dựng một workflow tự động đăng sản phẩm lên **Facebook Page** từ dữ liệu được đặt trong thư mục local trên máy Windows.

Mỗi sản phẩm gồm:

- Một thư mục riêng trong `inbox`.
- Một file `info.txt`.
- Một hoặc nhiều ảnh JPG/JPEG/PNG.
- Một file `READY.ok` để xác nhận dữ liệu đã sẵn sàng.

Luồng hoàn chỉnh:

1. n8n chạy thủ công hoặc theo lịch.
2. Quét thư mục `inbox`.
3. Chỉ lấy các thư mục có `READY.ok`.
4. Đọc và parse `info.txt`.
5. Kiểm tra sản phẩm đã từng đăng hay chưa.
6. Liệt kê ảnh.
7. Nếu không có ảnh thì dừng trước Claude và Facebook.
8. Gọi Claude Code local để đọc ảnh và viết nội dung.
9. Parse, kiểm tra và chuẩn hóa nội dung.
10. Upload toàn bộ ảnh lên Facebook với `published=false`.
11. Gom toàn bộ `PHOTO_ID`.
12. Đăng một bài Feed nhiều ảnh.
13. Đăng Facebook Story bằng ảnh đầu tiên.
14. Ghi file trạng thái `logs\<productCode>-published.json`.
15. Chuyển thư mục sản phẩm từ `inbox` sang `published`.
16. Nếu sản phẩm đã có file published record thì bỏ qua Claude và Facebook, chỉ chuyển thư mục còn sót sang `published`.
17. Có thể chạy bằng `Manual Trigger` hoặc `Schedule Trigger`.

## 2. Phạm vi hiện tại

Đang triển khai:

- Facebook Page Feed nhiều ảnh.
- Facebook Photo Story.
- Claude Code local đọc ảnh và sinh nội dung.
- Chống đăng trùng bằng file local.
- Chạy local trên Windows.
- Schedule mỗi 3 giờ.

Không triển khai trong giai đoạn hiện tại:

- Instagram.
- VPS.
- Custom MCP.
- Database.
- Hệ thống hàng đợi chuyên dụng.
- Retry nâng cao.
- Tự khởi động cùng Windows.
- Dashboard giám sát.

---

# PHẦN II — MÔI TRƯỜNG VÀ THÔNG TIN HỆ THỐNG

## 3. Môi trường đang sử dụng

- Hệ điều hành: Windows.
- Windows user:
  ```text
  Admin
  ```
- Thư mục dự án:
  ```text
  C:\Users\Admin\Desktop\facebook-agent
  ```
- n8n self-hosted:
  ```text
  Version: 2.29.10
  URL: http://localhost:5678
  ```
- Claude Bridge:
  ```text
  http://127.0.0.1:3333
  ```
- Claude executable:
  ```text
  C:\Users\Admin\.local\bin\claude.exe
  ```
- Meta Graph API:
  ```text
  v25.0
  ```
- Facebook Page:
  ```text
  Le’Coong
  ```
- Page ID:
  ```text
  864340803604548
  ```

## 4. Quy tắc bảo mật quan trọng

- Không gửi Page Access Token vào chat.
- Không hard-code token trong workflow.
- Không gắn token trực tiếp vào URL.
- Token đang lưu trong n8n Credential dạng Bearer Auth.
- Credential phải sử dụng đúng **Page Access Token**, không phải User Access Token.
- Có thể kiểm tra token bằng:
  ```text
  GET https://graph.facebook.com/v25.0/me?fields=id,name
  ```
- Kết quả đúng:
  ```json
  {
    "id": "864340803604548",
    "name": "Le’Coong"
  }
  ```

---

# PHẦN III — CẤU TRÚC THƯ MỤC

## 5. Cấu trúc dự án

```text
C:\Users\Admin\Desktop\facebook-agent\
├── inbox\
│   └── <PRODUCT_CODE>\
│       ├── info.txt
│       ├── 01.jpg
│       ├── 02.jpg
│       ├── ...
│       └── READY.ok
├── processing\
│   └── các draft test cũ nếu còn
├── published\
│   ├── A37\
│   ├── V889\
│   └── các sản phẩm đã đăng khác
├── failed\
├── logs\
│   ├── A37-published.json
│   ├── V889-published.json
│   └── claude-bridge\
├── prompts\
├── claude-bridge.js
├── start-n8n.bat
└── các file thử nghiệm cũ nếu còn
```

## 6. Quy ước thư mục sản phẩm

Ví dụ:

```text
C:\Users\Admin\Desktop\facebook-agent\inbox\TEST001
```

Bên trong:

```text
TEST001\
├── info.txt
├── 01.jpg
├── 02.jpg
├── 03.png
└── READY.ok
```

Quy tắc:

1. Tên thư mục phải trùng với `product_code`.
2. Đưa `info.txt` và toàn bộ ảnh vào trước.
3. Tạo `READY.ok` cuối cùng.
4. Chỉ hỗ trợ:
   ```text
   jpg
   jpeg
   png
   ```
5. Không dùng WebP trong luồng hiện tại.
6. Mã sản phẩm không được trùng với file đã có trong `logs`.
7. Nếu đã có:
   ```text
   logs\<productCode>-published.json
   ```
   thì hệ thống xem sản phẩm là đã đăng.

---

# PHẦN IV — ĐỊNH DẠNG `info.txt`

## 7. File mẫu

```text
product_code=TEST001
product_name=Sản phẩm Test Workflow
sizes=S,M,L
price=399000
sale_price=349000
colors=Đen,Trắng
material=Chất liệu mẫu
notes=Kiểm tra workflow tự động hoàn chỉnh
publish_post=true
publish_story=true
```

## 8. Quy tắc dữ liệu

- Mỗi dòng:
  ```text
  key=value
  ```
- Các trường bắt buộc:
  ```text
  product_code
  product_name
  sizes
  price
  ```
- Các trường tùy chọn:
  ```text
  sale_price
  colors
  material
  notes
  publish_post
  publish_story
  ```
- `sizes` và `colors` phân tách bằng dấu phẩy.
- `price` và `sale_price` phải là số lớn hơn 0.
- Mặc định:
  ```text
  publish_post=true
  publish_story=false
  ```
  nếu không nhập.

---

# PHẦN V — KHỞI ĐỘNG HỆ THỐNG

## 9. File `start-n8n.bat`

Đường dẫn:

```text
C:\Users\Admin\Desktop\facebook-agent\start-n8n.bat
```

Nội dung:

```bat
@echo off

set "NODES_EXCLUDE=[]"
set "N8N_RESTRICT_FILE_ACCESS_TO=C:\Users\Admin\Desktop\facebook-agent;C:\Users\Admin\.n8n-files"

n8n.cmd start
```

Ý nghĩa:

- `NODES_EXCLUDE=[]`: cho phép dùng node `Execute Command`.
- `N8N_RESTRICT_FILE_ACCESS_TO=...`: cho phép n8n đọc và ghi trong thư mục dự án.

Khởi động n8n:

```bat
call "C:\Users\Admin\Desktop\facebook-agent\start-n8n.bat"
```

Giữ cửa sổ CMD mở.

## 10. Khởi động Claude Bridge

Mở CMD khác:

```bat
node "C:\Users\Admin\Desktop\facebook-agent\claude-bridge.js"
```

Giữ cửa sổ CMD mở.

Kiểm tra:

```bat
curl.exe "http://127.0.0.1:3333/health"
```

Kết quả mong đợi:

```json
{
  "ok": true,
  "service": "claude-bridge"
}
```

---

# PHẦN VI — CLAUDE BRIDGE

## 11. Lý do sử dụng Bridge

n8n `Execute Command` không thu ổn định `stdout` từ Claude Code trên máy Windows này.

Giải pháp:

```text
n8n
  → POST http://127.0.0.1:3333/generate
  → Claude Bridge
  → Claude Code CLI
  → JSON trả về n8n
```

Bridge:

- nhận prompt;
- ghi prompt vào file tạm;
- chạy Claude Code CLI;
- đọc output JSON;
- trả `result`, `costUsd`, `usage`, `claude`;
- có timeout 180 giây;
- ghi `latest-output.json` để debug.

## 12. File Bridge

Đường dẫn:

```text
C:\Users\Admin\Desktop\facebook-agent\claude-bridge.js
```

Phiên bản nền tảng đã sử dụng:

```javascript
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const PORT = 3333;

const PROJECT_PATH =
  'C:\\Users\\Admin\\Desktop\\facebook-agent';

const CLAUDE_PATH =
  'C:\\Users\\Admin\\.local\\bin\\claude.exe';

const TEMP_PATH = path.join(
  PROJECT_PATH,
  'logs',
  'claude-bridge'
);

fs.mkdirSync(TEMP_PATH, {
  recursive: true,
});

function sendJson(res, statusCode, data) {
  const content = JSON.stringify(data);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(content),
  });

  res.end(content);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.setEncoding('utf8');

    req.on('data', chunk => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error('Request body quá lớn'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const promptFile = path.join(
      TEMP_PATH,
      `${requestId}-prompt.txt`
    );

    const outputFile = path.join(
      TEMP_PATH,
      `${requestId}-output.json`
    );

    const batFile = path.join(
      TEMP_PATH,
      `${requestId}-run.bat`
    );

    fs.writeFileSync(promptFile, prompt, 'utf8');

    const batContent = [
      '@echo off',
      'chcp 65001 > nul',
      `cd /d "${PROJECT_PATH}"`,
      `type "${promptFile}" | "${CLAUDE_PATH}" --bare --model sonnet --add-dir "${PROJECT_PATH}" -p "Follow the instructions from stdin exactly." --output-format json --no-session-persistence --max-turns 2 > "${outputFile}" 2>&1`,
      'exit /b %ERRORLEVEL%',
      '',
    ].join('\r\n');

    fs.writeFileSync(batFile, batContent, 'utf8');

    const child = spawn(
      'C:\\Windows\\System32\\cmd.exe',
      ['/d', '/c', batFile],
      {
        windowsHide: true,
        stdio: 'ignore',
      }
    );

    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        child.kill();
        reject(new Error('Claude chạy quá thời gian cho phép'));
      }
    }, 180000);

    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', exitCode => {
      finished = true;
      clearTimeout(timeout);

      let rawOutput = '';

      if (fs.existsSync(outputFile)) {
        rawOutput = fs
          .readFileSync(outputFile, 'utf8')
          .trim();
      }

      if (!rawOutput) {
        reject(
          new Error(
            `Claude không tạo output. Exit code: ${exitCode}`
          )
        );
        return;
      }

      let claudeResponse;

      try {
        claudeResponse = JSON.parse(rawOutput);
      } catch {
        reject(
          new Error(
            `Claude trả về dữ liệu không phải JSON: ${rawOutput}`
          )
        );
        return;
      }

      const latestOutput = path.join(
        TEMP_PATH,
        'latest-output.json'
      );

      fs.writeFileSync(
        latestOutput,
        JSON.stringify(claudeResponse, null, 2),
        'utf8'
      );

      for (const file of [promptFile, batFile]) {
        try {
          fs.unlinkSync(file);
        } catch {
        }
      }

      resolve({
        exitCode,
        result: claudeResponse.result || '',
        claudeResponse,
      });
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'claude-bridge',
        claudePath: CLAUDE_PATH,
      });

      return;
    }

    if (req.method === 'POST' && req.url === '/generate') {
      const rawBody = await readRequestBody(req);

      let body;

      try {
        body = JSON.parse(rawBody || '{}');
      } catch {
        sendJson(res, 400, {
          ok: false,
          error: 'Request body không phải JSON hợp lệ',
        });

        return;
      }

      const prompt = String(body.prompt || '').trim();

      if (!prompt) {
        sendJson(res, 400, {
          ok: false,
          error: 'Thiếu trường prompt',
        });

        return;
      }

      const result = await runClaude(prompt);

      sendJson(res, 200, {
        ok: true,
        result: result.result,
        exitCode: result.exitCode,
        costUsd:
          result.claudeResponse.total_cost_usd || 0,
        usage:
          result.claudeResponse.usage || {},
        claude: result.claudeResponse,
      });

      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: 'Không tìm thấy endpoint',
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message,
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `Claude Bridge đang chạy tại http://${HOST}:${PORT}`
  );
  console.log(
    `Kiểm tra: http://${HOST}:${PORT}/health`
  );
});
```

---

# PHẦN VII — SƠ ĐỒ WORKFLOW PRODUCTION HIỆN TẠI

## 13. Tên workflow đề xuất

```text
Facebook Auto Publisher - Production
```

## 14. Hai trigger

```text
Manual Trigger ─────────────┐
                            ├→ Scan Ready Products
Schedule Every 3 Hours ─────┘
```

`Manual Trigger` vẫn được giữ để chạy tay khi cần.

`Schedule Trigger` đã được thêm với cấu hình:

```text
Trigger Interval: Hours
Hours Between Triggers: 3
Trigger at Minute: 0
```

Tại thời điểm kết thúc phiên này:

- Schedule Trigger đã được thêm.
- Đã nối vào `Scan Ready Products`.
- Workflow đã chạy thành công từ đầu đến cuối bằng `Manual Trigger`.
- Chưa xác nhận trong phiên này việc bật Active.
- Trước khi bật Active cần kiểm tra timezone và đảm bảo n8n + Claude Bridge luôn chạy.

## 15. Sơ đồ production đầy đủ

```text
Manual Trigger ─────────────┐
                            ├→ Scan Ready Products
Schedule Every 3 Hours ─────┘
                                  ↓
                         Has Ready Product?
                                  ↓ True
                         Split Product Paths
                                  ↓
                         Read Product Info
                                  ↓
                         Parse Product Info
                                  ↓
                  Check Published Record Exists
                                  ↓
                 Parse Published Check Result
                                  ↓
                    Should Continue Publishing?
                     ├── False: đã đăng trước đó
                     │      ↓
                     │ Build Skipped Product Result
                     │      ↓
                     │ Prepare Skipped Folder Move
                     │      ↓
                     │ Move Already Published Folder
                     │
                     └── True: sản phẩm mới
                            ↓
                     List Product Images
                            ↓
                     Parse Image List
                            ↓
                     Has Product Images?
                     ├── False
                     │      ↓
                     │ Build Missing Images Result
                     │
                     └── True
                            ↓
                     Build Claude Prompt
                            ↓
                     Generate Facebook Content
                            ↓
                     Parse Generated Content
                            ↓
                     Validate Generated Content
                            ↓
                     Split Facebook Image Paths
                            ↓
                     Read Each Facebook Image
                            ↓
                     Upload Each Unpublished Facebook Photo
                            ↓
                     Collect Facebook Photo IDs
                        ├─────────────────────────┐
                        │                         │
                        ↓                         ↓
             Build Facebook               Read Facebook
             Multi-Photo Request           Story Image
                        ↓                         ↓
             Publish Facebook             Upload Unpublished
             Multi-Photo Post             Facebook Story Photo
                        │                         ↓
                        │                 Publish Facebook
                        │                 Photo Story
                        └──────────┬──────────────┘
                                   ↓
                     Merge Facebook Publish Results
                                   ↓
                     Build Actual Facebook Publish Result
                                   ↓
                     Build Published Record
                                   ↓
                     Convert Published Record to File
                                   ↓
                     Save Published Record to Disk
                                   ↓
                     Prepare Published Folder Move
                                   ↓
                     Move Newly Published Folder
                                   ↓
                     Verify Published Folder Move
```

---

# PHẦN VIII — CHI TIẾT NODE TỪ ĐẦU ĐẾN CLAUDE

## 16. `Scan Ready Products`

Node type:

```text
Execute Command
```

Command:

```bat
for /d %D in ("C:\Users\Admin\Desktop\facebook-agent\inbox\*") do @if exist "%D\READY.ok" echo %~fD
```

Kết quả:

- Một dòng cho mỗi thư mục có `READY.ok`.
- `stdout` rỗng nếu không có sản phẩm.

## 17. `Has Ready Product?`

Node type:

```text
If
```

Điều kiện:

```javascript
{{ $json.stdout }}
```

Operation:

```text
is not empty
```

## 18. `Split Product Paths`

Node type:

```text
Code
```

Mode:

```text
Run Once for All Items
```

Code:

```javascript
const stdout = $input.first().json.stdout || '';

const paths = stdout
  .split(/\r?\n/)
  .map(path => path.trim())
  .filter(path => path !== '');

return paths.map(path => ({
  json: {
    productFolder: path,
    productCode: path.split('\\').pop()
  }
}));
```

## 19. `Read Product Info`

Node type:

```text
Execute Command
```

`Execute Once`: OFF

Command:

```bat
chcp 65001 > nul && type "{{$json.productFolder}}\info.txt"
```

## 20. `Parse Product Info`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const rawText = String($json.stdout || '')
  .replace(/^\uFEFF/, '')
  .trim();

const data = {};

for (const line of rawText.split(/\r?\n/)) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    continue;
  }

  const equalPosition = trimmedLine.indexOf('=');

  if (equalPosition === -1) {
    continue;
  }

  const key = trimmedLine.slice(0, equalPosition).trim();
  const value = trimmedLine.slice(equalPosition + 1).trim();

  data[key] = value;
}

const requiredFields = [
  'product_code',
  'product_name',
  'sizes',
  'price'
];

const missingFields = requiredFields.filter(
  field => !data[field]
);

if (missingFields.length > 0) {
  throw new Error(
    `Thiếu trường bắt buộc: ${missingFields.join(', ')}`
  );
}

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return String(value).toLowerCase() === 'true';
};

const price = Number(data.price);

const salePrice = data.sale_price
  ? Number(data.sale_price)
  : null;

if (Number.isNaN(price) || price <= 0) {
  throw new Error('price phải là một số lớn hơn 0');
}

if (
  salePrice !== null &&
  (Number.isNaN(salePrice) || salePrice <= 0)
) {
  throw new Error('sale_price phải là một số lớn hơn 0');
}

const sourceProduct = $('Split Product Paths').item.json;

return {
  json: {
    productFolder: sourceProduct.productFolder,
    productCode: data.product_code,
    productName: data.product_name,

    sizes: data.sizes
      .split(',')
      .map(size => size.trim())
      .filter(Boolean),

    price,
    salePrice,

    colors: data.colors
      ? data.colors
          .split(',')
          .map(color => color.trim())
          .filter(Boolean)
      : [],

    material: data.material || '',
    notes: data.notes || '',

    publishPost: parseBoolean(data.publish_post, true),
    publishStory: parseBoolean(data.publish_story, false)
  }
};
```

---

# PHẦN IX — CHỐNG ĐĂNG TRÙNG TRƯỚC CLAUDE

## 21. Nguyên tắc chống trùng

File xác nhận đã đăng:

```text
C:\Users\Admin\Desktop\facebook-agent\logs\<productCode>-published.json
```

Nếu file này tồn tại:

- không gọi Claude;
- không upload ảnh;
- không đăng Feed;
- không đăng Story;
- chỉ chuyển thư mục sản phẩm còn sót từ `inbox` sang `published`.

## 22. `Check Published Record Exists`

Node type:

```text
Execute Command
```

`Execute Once`: OFF

Toàn bộ Command phải ở chế độ Expression:

```javascript
{{
  'chcp 65001 > nul' +
  ' && echo PRODUCT_CODE=' + $json.productCode +
  ' && echo RECORD_PATH=C:\\Users\\Admin\\Desktop\\facebook-agent\\logs\\' +
  $json.productCode +
  '-published.json' +
  ' && if exist "C:\\Users\\Admin\\Desktop\\facebook-agent\\logs\\' +
  $json.productCode +
  '-published.json" (echo STATUS=PUBLISHED_EXISTS) else (echo STATUS=NOT_PUBLISHED)'
}}
```

## 23. `Parse Published Check Result`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const checkResult = $json;
const product = $('Parse Product Info').item.json;

const stdout = String(checkResult.stdout || '').trim();

const publishedRecordExists =
  stdout.includes('STATUS=PUBLISHED_EXISTS');

const notPublished =
  stdout.includes('STATUS=NOT_PUBLISHED');

if (!publishedRecordExists && !notPublished) {
  throw new Error(
    `Không xác định được trạng thái kiểm tra: ${stdout}`
  );
}

return {
  json: {
    ...product,

    publishedRecordPath:
      `C:\\Users\\Admin\\Desktop\\facebook-agent\\logs\\${product.productCode}-published.json`,

    publishedRecordExists,

    publishDecision: publishedRecordExists
      ? 'SKIP_ALREADY_PUBLISHED'
      : 'CONTINUE_PUBLISHING',

    checkStatus: publishedRecordExists
      ? 'PUBLISHED_EXISTS'
      : 'NOT_PUBLISHED'
  }
};
```

## 24. `Should Continue Publishing?`

Node type:

```text
If
```

Value 1:

```javascript
{{ $json.publishDecision }}
```

Operation:

```text
equals
```

Value 2:

```text
CONTINUE_PUBLISHING
```

Kết nối:

- True → `List Product Images`
- False → `Build Skipped Product Result`

## 25. `Build Skipped Product Result`

Node type:

```text
Code
```

Code:

```javascript
const data = $json;

if (data.publishDecision !== 'SKIP_ALREADY_PUBLISHED') {
  throw new Error(
    `Item không thuộc nhánh bỏ qua: ${data.productCode}`
  );
}

return {
  json: {
    productCode: data.productCode,
    productName: data.productName,
    productFolder: data.productFolder,

    status: 'SKIPPED_ALREADY_PUBLISHED',
    reason: 'PUBLISHED_RECORD_EXISTS',

    publishedRecordPath: data.publishedRecordPath,
    publishedRecordExists:
      data.publishedRecordExists === true,

    skippedBeforeClaude: true,
    skippedBeforeFacebook: true,
    skippedAt: new Date().toISOString()
  }
};
```

## 26. `Prepare Skipped Folder Move`

Node type:

```text
Code
```

Code:

```javascript
const data = $json;

if (data.status !== 'SKIPPED_ALREADY_PUBLISHED') {
  throw new Error(
    `Sản phẩm ${data.productCode} không thuộc nhánh đã đăng`
  );
}

const productCode =
  String(data.productCode || '').trim();

const sourceFolder =
  String(data.productFolder || '').trim();

if (!productCode) {
  throw new Error('Thiếu productCode');
}

if (!sourceFolder) {
  throw new Error('Thiếu productFolder');
}

const destinationFolder =
  `C:\\Users\\Admin\\Desktop\\facebook-agent\\published\\${productCode}`;

return {
  json: {
    ...data,
    sourceFolder,
    destinationFolder,

    moveDecision:
      'READY_TO_MOVE_ALREADY_PUBLISHED',

    preparedAt: new Date().toISOString()
  }
};
```

## 27. `Move Already Published Folder`

Đây là node cũ từng có tên:

```text
Move Product Folder to Published
```

Đã đổi tên thành:

```text
Move Already Published Folder
```

Node này **chỉ được dùng cho nhánh**:

```text
Prepare Skipped Folder Move
→ Move Already Published Folder
```

Không nối từ `Prepare Published Folder Move` nữa.

Command chuẩn hóa:

```javascript
{{
  'if exist "' + $json.destinationFolder + '" ' +
  '(echo STATUS=ALREADY_MOVED) ' +
  'else (' +
    'if not exist "' + $json.sourceFolder + '" ' +
    '(echo STATUS=SOURCE_NOT_FOUND & exit /b 2) ' +
    'else (' +
      'if not exist "C:\\Users\\Admin\\Desktop\\facebook-agent\\published" ' +
      'mkdir "C:\\Users\\Admin\\Desktop\\facebook-agent\\published" ' +
      '& move "' + $json.sourceFolder + '" "' + $json.destinationFolder + '" > nul ' +
      '& if exist "' + $json.destinationFolder + '" ' +
      '(echo STATUS=MOVED) ' +
      'else (echo STATUS=MOVE_FAILED & exit /b 4)' +
    ')' +
  ')'
}}
```

Lưu ý:

- Node này có thể trả `stdout` rỗng trên Windows.
- Kiểm tra thực tế bằng sự tồn tại của thư mục.
- Nó không còn dùng cho sản phẩm vừa đăng xong.

---

# PHẦN X — ẢNH SẢN PHẨM VÀ NHÁNH KHÔNG CÓ ẢNH

## 28. `List Product Images`

Node type:

```text
Execute Command
```

`Execute Once`: OFF

Command:

```bat
for %E in (jpg jpeg png) do @for %F in ("{{$json.productFolder}}\*.%E") do @if exist "%~fF" echo %~fF
```

## 29. `Parse Image List`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const product = $('Parse Product Info').item.json;

const stdout = String($json.stdout || '').trim();

const imagePaths = stdout
  ? stdout
      .split(/\r?\n/)
      .map(path => path.trim())
      .filter(Boolean)
  : [];

return {
  json: {
    ...product,
    imagePaths,
    imageCount: imagePaths.length,
    hasImages: imagePaths.length > 0
  }
};
```

## 30. `Has Product Images?`

Node type:

```text
If
```

Expression:

```javascript
{{ $json.hasImages }}
```

Operation:

```text
is true
```

True:

```text
Build Claude Prompt
```

False:

```text
Build Missing Images Result
```

## 31. `Build Missing Images Result`

Code:

```javascript
const data = $json;

return {
  json: {
    productCode: data.productCode,
    productName: data.productName,
    productFolder: data.productFolder,

    imagePaths: data.imagePaths || [],
    imageCount: data.imageCount || 0,

    status: 'FAILED_VALIDATION',
    errorCode: 'NO_PRODUCT_IMAGES',

    message:
      `Sản phẩm ${data.productCode} đã có READY.ok nhưng không tìm thấy ảnh JPG, JPEG hoặc PNG.`,

    stoppedBeforeClaude: true,
    stoppedBeforeFacebook: true,
    failedAt: new Date().toISOString()
  }
};
```

Trạng thái:

- Node tạo kết quả lỗi đã có.
- Chưa hoàn thiện:
  - ghi file lỗi vào `failed`;
  - chuyển thư mục sang `failed`.

---

# PHẦN XI — CLAUDE CONTENT GENERATION

## 32. `Build Claude Prompt`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const product = $json;

const formatPrice = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  return (
    new Intl.NumberFormat('vi-VN')
      .format(Number(value)) + 'đ'
  );
};

const imageList = product.imagePaths
  .map(
    (imagePath, index) =>
      `${index + 1}. ${imagePath}`
  )
  .join('\n');

const prompt = `
Bạn là chuyên viên nội dung cho một cửa hàng thời trang tại Việt Nam.

Hãy đọc và phân tích trực tiếp các hình ảnh sản phẩm tại các đường dẫn sau:

${imageList}

THÔNG TIN SẢN PHẨM:
- Mã sản phẩm: ${product.productCode}
- Tên sản phẩm: ${product.productName}
- Size: ${product.sizes.join(', ')}
- Giá niêm yết: ${formatPrice(product.price)}
- Giá khuyến mãi: ${formatPrice(product.salePrice)}
- Màu sắc: ${product.colors.join(', ')}
- Chất liệu: ${product.material}
- Ghi chú: ${product.notes}

YÊU CẦU:
1. Quan sát hình ảnh để mô tả đúng kiểu dáng, màu sắc và phong cách.
2. Viết một bài đăng Facebook bằng tiếng Việt, tự nhiên và thu hút.
3. Nội dung phải có mã sản phẩm, size và giá bán.
4. Không tự bịa chất liệu, công dụng, ưu đãi, chính sách hoặc thông tin không được cung cấp.
5. Không viết quá khoa trương.
6. Có lời kêu gọi khách hàng nhắn tin đặt hàng.
7. Tạo từ 3 đến 6 hashtag phù hợp.
8. Viết thêm một câu Story ngắn, tối đa 100 ký tự.
9. Không sử dụng markdown.

QUY TẮC OUTPUT BẮT BUỘC:
- Ký tự đầu tiên trong câu trả lời phải là {
- Ký tự cuối cùng trong câu trả lời phải là }
- Không viết lời giới thiệu, giải thích hoặc nhận xét trước JSON.
- Không viết bất kỳ nội dung nào sau JSON.
- Không sử dụng markdown hoặc code fence.
- Chỉ trả về đúng một JSON object hợp lệ theo cấu trúc sau:

{
  "facebookCaption": "Nội dung bài Facebook",
  "storyText": "Nội dung ngắn cho Story",
  "imageSummary": "Mô tả ngắn những gì quan sát được trong ảnh",
  "hashtags": ["hashtag1", "hashtag2"],
  "productCode": "${product.productCode}"
}
`.trim();

return {
  json: {
    ...product,
    prompt
  }
};
```

## 33. `Generate Facebook Content`

Node type:

```text
HTTP Request
```

Method:

```text
POST
```

URL:

```text
http://127.0.0.1:3333/generate
```

Body Content Type:

```text
JSON
```

Body:

```javascript
prompt = {{ $json.prompt }}
```

Timeout:

```text
180000
```

Response:

```text
JSON
```

## 34. `Parse Generated Content`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Lỗi đã gặp:

- Claude Bridge có kết quả nhưng node chỉ kiểm tra `$json.result`.
- Một số response đặt kết quả ở `$json.body`, `$json.claude`, hoặc cấu trúc lồng nhau.
- Đã sửa để đọc nhiều vị trí.

Phiên bản logic robust đang dùng:

```javascript
const bridgeResponse = $json.body ?? $json;

if (bridgeResponse.ok === false) {
  throw new Error(
    bridgeResponse.error ||
    'Claude Bridge trả về lỗi nhưng không có thông báo chi tiết'
  );
}

const possibleResults = [
  bridgeResponse.result,
  bridgeResponse.data?.result,
  bridgeResponse.claude?.result,
  $json.body?.result,
  $json.body?.claude?.result,
];

let rawResult = String(
  possibleResults.find(value => {
    return value !== undefined &&
      value !== null &&
      String(value).trim() !== '';
  }) || ''
).trim();

if (!rawResult) {
  throw new Error(
    `Claude không trả về nội dung. Dữ liệu nhận được: ${JSON.stringify($json)}`
  );
}

rawResult = rawResult
  .replace(/```json/gi, '')
  .replace(/```/g, '')
  .trim();

function extractFirstJsonObject(text) {
  const startIndex = text.indexOf('{');

  if (startIndex === -1) {
    throw new Error(
      `Không tìm thấy JSON trong kết quả Claude: ${text}`
    );
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && insideString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      insideString = !insideString;
      continue;
    }

    if (insideString) {
      continue;
    }

    if (char === '{') {
      depth++;
    }

    if (char === '}') {
      depth--;

      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  throw new Error(
    'JSON Claude trả về chưa đóng đầy đủ'
  );
}

const jsonText =
  extractFirstJsonObject(rawResult);

let generatedContent;

try {
  generatedContent = JSON.parse(jsonText);
} catch (error) {
  throw new Error(
    `JSON Claude không hợp lệ: ${error.message}. Nội dung: ${jsonText}`
  );
}

const product =
  $('Build Claude Prompt').item.json;

if (!generatedContent.facebookCaption) {
  throw new Error(
    'Claude thiếu trường facebookCaption'
  );
}

if (!generatedContent.storyText) {
  throw new Error(
    'Claude thiếu trường storyText'
  );
}

const claudeCostUsd = Number(
  bridgeResponse.costUsd ??
  bridgeResponse.total_cost_usd ??
  bridgeResponse.claude?.total_cost_usd ??
  $json.body?.costUsd ??
  $json.body?.claude?.total_cost_usd ??
  0
);

const claudeUsage =
  bridgeResponse.usage ??
  bridgeResponse.claude?.usage ??
  $json.body?.usage ??
  $json.body?.claude?.usage ??
  {};

return {
  json: {
    productFolder: product.productFolder,
    productCode: product.productCode,
    productName: product.productName,

    sizes: product.sizes,
    price: product.price,
    salePrice: product.salePrice,
    colors: product.colors,
    material: product.material,
    notes: product.notes,

    imagePaths: product.imagePaths,
    imageCount: product.imageCount,

    facebookCaption:
      generatedContent.facebookCaption,

    storyText:
      generatedContent.storyText,

    imageSummary:
      generatedContent.imageSummary || '',

    hashtags:
      Array.isArray(generatedContent.hashtags)
        ? generatedContent.hashtags
        : [],

    claudeProductCode:
      generatedContent.productCode || '',

    claudeCostUsd,
    claudeUsage
  }
};
```

Ghi chú:

- V889 đã chạy thành công.
- Chi phí lượt V889 khoảng:
  ```text
  0.02742615 USD
  ```
- `terminal_reason` của Claude:
  ```text
  completed
  ```

## 35. `Validate Generated Content`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const data = $json;

const productCode =
  String(data.productCode || '').trim();

let facebookCaption =
  String(data.facebookCaption || '').trim();

let storyText =
  String(data.storyText || '').trim();

if (!productCode) {
  throw new Error('Thiếu mã sản phẩm');
}

if (!facebookCaption) {
  throw new Error(
    'Caption Facebook đang trống'
  );
}

if (!storyText) {
  throw new Error(
    'Nội dung Story đang trống'
  );
}

const normalizeText = (value) => {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
};

if (
  !normalizeText(facebookCaption).includes(
    normalizeText(productCode)
  )
) {
  facebookCaption =
    `${facebookCaption}\n\nMã sản phẩm: ${productCode}`;
}

if (storyText.length > 150) {
  storyText =
    storyText.slice(0, 147).trim() + '...';
}

const blockedHashtags = [
  '#salethaido'
];

const hashtags =
  Array.isArray(data.hashtags)
    ? data.hashtags
        .map(tag => String(tag).trim())
        .filter(Boolean)
        .map(tag =>
          tag.startsWith('#')
            ? tag
            : `#${tag}`
        )
        .filter(tag => {
          return !blockedHashtags.includes(
            tag.toLowerCase()
          );
        })
        .slice(0, 6)
    : [];

const hashtagsNotInCaption =
  hashtags.filter(tag => {
    return !facebookCaption
      .toLowerCase()
      .includes(tag.toLowerCase());
  });

const hashtagText =
  hashtagsNotInCaption.join(' ');

const finalCaption = hashtagText
  ? `${facebookCaption}\n\n${hashtagText}`
  : facebookCaption;

return {
  json: {
    ...data,
    facebookCaption,
    storyText,
    hashtags,
    finalCaption,
    validationStatus: 'PASSED',
    validatedAt: new Date().toISOString()
  }
};
```

---

# PHẦN XII — CÁC NHÁNH TEST ĐÃ NGẮT

## 36. Nhánh test ảnh đầu tiên

Các node:

```text
Read First Facebook Image
Upload Unpublished Facebook Photo
```

Đây là nhánh test cũ chỉ upload ảnh đầu tiên.

Đã ngắt kết nối khỏi:

```text
Validate Generated Content
```

Không được nối lại trong production vì sẽ upload thừa ảnh đầu tiên.

Có thể đổi tên:

```text
[TEST] Read First Facebook Image
[TEST] Upload Unpublished Facebook Photo
```

## 37. Nhánh draft cũ

Các node:

```text
Build Draft Content
Convert Draft to File
Save Draft to Disk
```

Đã ngắt kết nối khỏi:

```text
Validate Generated Content
```

Nguyên nhân:

- Đây là nhánh test.
- Production đã lưu `*-published.json` đầy đủ hơn.
- Published record có Feed ID, Story ID, photo IDs và trạng thái.

Có thể đổi tên:

```text
[TEST] Build Draft Content
[TEST] Convert Draft to File
[TEST] Save Draft to Disk
```

## 38. Các node recovery A37

Các node test phục hồi:

```text
[TEST A37] Restore Successful Feed Result
[TEST A37] Restore Successful Facebook Results
[TEST A37] Build Facebook Publish Result
```

Yêu cầu:

- không nối vào production;
- hoặc Disable;
- chỉ giữ lại để tham khảo;
- không dùng khi test sản phẩm mới.

---

# PHẦN XIII — UPLOAD TOÀN BỘ ẢNH FACEBOOK

## 39. `Split Facebook Image Paths`

Node type:

```text
Split Out
```

Field to Split Out:

```text
imagePaths
```

Include:

```text
All Other Fields
```

Destination Field:

```text
imagePath
```

Kết quả:

- Mỗi ảnh trở thành một item.
- V889 có 4 ảnh → 4 item.

## 40. `Read Each Facebook Image`

Node type:

```text
Read/Write Files from Disk
```

Operation:

```text
Read File(s) From Disk
```

File selector:

```javascript
{{ $json.imagePath }}
```

Output Binary Field:

```text
data
```

## 41. `Upload Each Unpublished Facebook Photo`

Node type:

```text
HTTP Request
```

Method:

```text
POST
```

URL:

```text
https://graph.facebook.com/v25.0/864340803604548/photos
```

Authentication:

```text
Generic Credential Type
→ Bearer Auth
→ Page Access Token của Le’Coong
```

Body Content Type:

```text
Form-Data
```

Parameters:

Ảnh:

```text
Parameter Type: n8n Binary File
Name: source
Input Binary Field: data
```

Trạng thái unpublished:

```text
Parameter Type: Form Data
Name: published
Value: false
```

Mô tả ảnh:

```text
Parameter Type: Form Data
Name: alt_text_custom
Value: {{ $json.imageSummary }}
```

Kết quả:

```json
{
  "id": "<PHOTO_ID>"
}
```

## 42. `Collect Facebook Photo IDs`

Node type:

```text
Code
```

Mode:

```text
Run Once for All Items
```

Code:

```javascript
const uploadItems = $input.all();

const sourceItems =
  $('Split Facebook Image Paths').all();

if (uploadItems.length === 0) {
  throw new Error(
    'Không nhận được PHOTO_ID nào từ Facebook'
  );
}

if (uploadItems.length !== sourceItems.length) {
  throw new Error(
    `Số kết quả upload (${uploadItems.length}) không khớp ` +
    `số ảnh đầu vào (${sourceItems.length})`
  );
}

const productGroups = new Map();

for (
  let index = 0;
  index < uploadItems.length;
  index++
) {
  const uploadResult =
    uploadItems[index].json;

  const sourceImage =
    sourceItems[index].json;

  const photoId =
    String(uploadResult.id || '').trim();

  const productCode =
    String(sourceImage.productCode || '').trim();

  if (!photoId) {
    throw new Error(
      `Ảnh thứ ${index + 1} không có PHOTO_ID`
    );
  }

  if (!productCode) {
    throw new Error(
      `Ảnh thứ ${index + 1} không có productCode`
    );
  }

  if (!productGroups.has(productCode)) {
    productGroups.set(productCode, {
      productCode,
      productName:
        sourceImage.productName || '',
      productFolder:
        sourceImage.productFolder || '',
      finalCaption:
        sourceImage.finalCaption || '',
      storyText:
        sourceImage.storyText || '',
      imageSummary:
        sourceImage.imageSummary || '',
      photoIds: [],
      imagePaths: []
    });
  }

  const product =
    productGroups.get(productCode);

  product.photoIds.push(photoId);
  product.imagePaths.push(
    sourceImage.imagePath
  );
}

return Array
  .from(productGroups.values())
  .map(product => ({
    json: {
      ...product,

      attachedMedia:
        product.photoIds.map(photoId => ({
          media_fbid: photoId
        })),

      uploadedPhotoCount:
        product.photoIds.length,

      uploadStatus:
        'ALL_PHOTOS_UPLOADED',

      collectedAt:
        new Date().toISOString()
    }
  }));
```

Lưu ý:

- Code nhóm theo `productCode`.
- Đã test:
  - A37: 5 ảnh.
  - V889: 4 ảnh.

---

# PHẦN XIV — ĐĂNG FACEBOOK FEED NHIỀU ẢNH

## 43. `Build Facebook Multi-Photo Request`

Node type:

```text
Code
```

Mode:

```text
Run Once for Each Item
```

Code:

```javascript
const data = $json;

const finalCaption =
  String(data.finalCaption || '').trim();

const attachedMedia =
  Array.isArray(data.attachedMedia)
    ? data.attachedMedia
    : [];

if (!finalCaption) {
  throw new Error(
    'Không có finalCaption để đăng Facebook'
  );
}

if (attachedMedia.length === 0) {
  throw new Error(
    'Không có ảnh trong attachedMedia'
  );
}

if (
  attachedMedia.length !==
  data.uploadedPhotoCount
) {
  throw new Error(
    `Số attachedMedia (${attachedMedia.length}) không khớp ` +
    `uploadedPhotoCount (${data.uploadedPhotoCount})`
  );
}

const bodyParts = [];

bodyParts.push(
  `message=${encodeURIComponent(finalCaption)}`
);

attachedMedia.forEach((media, index) => {
  const photoId =
    String(media.media_fbid || '').trim();

  if (!photoId) {
    throw new Error(
      `attachedMedia thứ ${index + 1} thiếu media_fbid`
    );
  }

  const parameterName =
    `attached_media[${index}]`;

  const parameterValue =
    JSON.stringify({
      media_fbid: photoId
    });

  bodyParts.push(
    `${encodeURIComponent(parameterName)}=` +
    `${encodeURIComponent(parameterValue)}`
  );
});

return {
  json: {
    ...data,

    facebookFeedEndpoint:
      'https://graph.facebook.com/v25.0/864340803604548/feed',

    facebookFeedBody:
      bodyParts.join('&'),

    preparedAttachedMediaCount:
      attachedMedia.length,

    requestStatus:
      'READY_TO_PUBLISH',

    preparedAt:
      new Date().toISOString()
  }
};
```

Cảnh báo:

- Node từng bị dán nhầm code recovery.
- Code production phải là code xây `facebookFeedBody` ở trên.

## 44. `Publish Facebook Multi-Photo Post`

Node type:

```text
HTTP Request
```

Method:

```text
POST
```

URL:

```javascript
{{ $json.facebookFeedEndpoint }}
```

Authentication:

```text
Bearer Auth Page Token
```

Body:

```text
Raw / Custom
```

Content-Type:

```text
application/x-www-form-urlencoded
```

Body:

```javascript
{{ $json.facebookFeedBody }}
```

Kết quả:

```json
{
  "id": "<PAGE_ID>_<POST_ID>",
  "post_supports_client_mutation_id": true
}
```

---

# PHẦN XV — ĐĂNG FACEBOOK STORY

## 45. `Read Facebook Story Image`

Nguồn:

```text
Collect Facebook Photo IDs
```

Node type:

```text
Read/Write Files from Disk
```

Operation:

```text
Read File(s) From Disk
```

File selector:

```javascript
{{ $json.imagePaths[0] }}
```

Output Binary Field:

```text
data
```

## 46. `Upload Unpublished Facebook Story Photo`

Node type:

```text
HTTP Request
```

Method:

```text
POST
```

URL:

```text
https://graph.facebook.com/v25.0/864340803604548/photos
```

Authentication:

```text
Bearer Auth Page Token
```

Body Content Type:

```text
Form-Data
```

Parameters:

```text
source = binary data
published = false
```

Kết quả:

```json
{
  "id": "<STORY_PHOTO_ID>"
}
```

## 47. `Publish Facebook Photo Story`

Node type:

```text
HTTP Request
```

Method:

```text
POST
```

URL:

```text
https://graph.facebook.com/v25.0/864340803604548/photo_stories
```

Authentication:

```text
Bearer Auth Page Token
```

Body Content Type:

```text
Form-Data
```

Parameter:

```text
photo_id = {{ $json.id }}
```

Kết quả:

```json
{
  "success": true,
  "post_id": "<STORY_POST_ID>"
}
```

---

# PHẦN XVI — GỘP KẾT QUẢ FEED VÀ STORY

## 48. `Merge Facebook Publish Results`

Input 1:

```text
Publish Facebook Multi-Photo Post
```

Input 2:

```text
Publish Facebook Photo Story
```

Mode:

```text
Combine
```

Combine By:

```text
Position
```

Include Any Unpaired Items:

```text
OFF
```

Output:

- một item;
- có Feed `id`;
- có Story `success`;
- có Story `post_id`.

## 49. `Build Actual Facebook Publish Result`

Node type:

```text
Code
```

Code:

```javascript
const mergedResult = $json;

const product =
  $('Collect Facebook Photo IDs').item.json;

const feedPostId =
  String(mergedResult.id || '').trim();

const storyPostId =
  String(mergedResult.post_id || '').trim();

const storySuccess =
  mergedResult.success === true;

if (!product.productCode) {
  throw new Error(
    'Không lấy được productCode'
  );
}

if (!feedPostId) {
  throw new Error(
    `Sản phẩm ${product.productCode} thiếu Facebook Feed POST_ID`
  );
}

if (!storySuccess || !storyPostId) {
  throw new Error(
    `Sản phẩm ${product.productCode} chưa đăng Story thành công`
  );
}

return {
  json: {
    productCode: product.productCode,
    productName: product.productName,
    productFolder: product.productFolder,

    facebookFeed: {
      status: 'PUBLISHED',
      postId: feedPostId,
      photoIds: product.photoIds || [],
      photoCount:
        product.uploadedPhotoCount || 0
    },

    facebookStory: {
      status: 'PUBLISHED',
      postId: storyPostId,
      success: storySuccess
    },

    content: {
      finalCaption:
        product.finalCaption || '',
      storyText:
        product.storyText || '',
      imageSummary:
        product.imageSummary || ''
    },

    imagePaths:
      product.imagePaths || [],

    overallStatus: 'PUBLISHED',
    recoveredFromPreviousRun: false,
    publishedAt: new Date().toISOString()
  }
};
```

Cảnh báo kỹ thuật:

- `$('Collect Facebook Photo IDs').item.json` phụ thuộc item linking.
- Luồng hiện tại đã chạy ổn với một sản phẩm.
- Nếu sau này chạy nhiều sản phẩm song song mà `.item` lỗi:
  - chưa vội đổi toàn bộ sang `.first()`;
  - cần thiết kế correlation theo `productCode`;
  - `.first()` chỉ là workaround cho một sản phẩm.

---

# PHẦN XVII — GHI PUBLISHED RECORD

## 50. `Build Published Record`

Code:

```javascript
const data = $json;

if (data.overallStatus !== 'PUBLISHED') {
  throw new Error(
    `Không thể tạo published record vì trạng thái hiện tại là: ${data.overallStatus}`
  );
}

if (!data.productCode) {
  throw new Error('Thiếu productCode');
}

if (!data.facebookFeed?.postId) {
  throw new Error(
    'Thiếu Facebook Feed postId'
  );
}

if (!data.facebookStory?.postId) {
  throw new Error(
    'Thiếu Facebook Story postId'
  );
}

const publishedRecord = {
  productCode: data.productCode,
  productName: data.productName,
  productFolder: data.productFolder,

  platforms: {
    facebookFeed: {
      status:
        data.facebookFeed.status,
      postId:
        data.facebookFeed.postId,
      photoIds:
        data.facebookFeed.photoIds || [],
      photoCount:
        data.facebookFeed.photoCount || 0
    },

    facebookStory: {
      status:
        data.facebookStory.status,
      postId:
        data.facebookStory.postId,
      success:
        data.facebookStory.success === true
    }
  },

  content: {
    finalCaption:
      data.content?.finalCaption || '',
    storyText:
      data.content?.storyText || '',
    imageSummary:
      data.content?.imageSummary || ''
  },

  images:
    data.imagePaths || [],

  overallStatus: 'PUBLISHED',

  recoveredFromPreviousRun:
    data.recoveredFromPreviousRun === true,

  publishedAt:
    data.publishedAt,

  recordCreatedAt:
    new Date().toISOString()
};

const publishedFilePath =
  `C:\\Users\\Admin\\Desktop\\facebook-agent\\logs\\${data.productCode}-published.json`;

return {
  json: {
    productCode: data.productCode,
    publishedFilePath,
    publishedRecord,
    jsonContent:
      JSON.stringify(
        publishedRecord,
        null,
        2
      )
  }
};
```

## 51. `Convert Published Record to File`

Node type:

```text
Convert to File
```

Operation:

```text
Convert to Text File
```

Text Input Field:

```text
jsonContent
```

Output Binary Field:

```text
data
```

File Name:

```javascript
{{ $json.productCode + '-published.json' }}
```

Encoding:

```text
UTF-8
```

## 52. `Save Published Record to Disk`

Node type:

```text
Read/Write Files from Disk
```

Operation:

```text
Write File to Disk
```

Input Binary Field:

```text
data
```

File Path and Name:

```javascript
{{ $('Build Published Record').item.json.publishedFilePath }}
```

Ví dụ:

```text
C:\Users\Admin\Desktop\facebook-agent\logs\V889-published.json
```

---

# PHẦN XVIII — CHUYỂN THƯ MỤC SẢN PHẨM MỚI ĐĂNG

## 53. `Prepare Published Folder Move`

Code:

```javascript
const publishedData =
  $('Build Published Record').item.json;

const productCode =
  String(
    publishedData.productCode || ''
  ).trim();

const sourceFolder =
  String(
    publishedData
      .publishedRecord
      ?.productFolder || ''
  ).trim();

if (!productCode) {
  throw new Error('Thiếu productCode');
}

if (!sourceFolder) {
  throw new Error(
    'Thiếu thư mục nguồn productFolder'
  );
}

const destinationFolder =
  `C:\\Users\\Admin\\Desktop\\facebook-agent\\published\\${productCode}`;

return {
  json: {
    productCode,

    productName:
      publishedData
        .publishedRecord
        ?.productName || '',

    sourceFolder,
    destinationFolder,

    publishedRecordPath:
      publishedData.publishedFilePath,

    overallStatus:
      publishedData
        .publishedRecord
        ?.overallStatus,

    moveDecision:
      'READY_TO_MOVE',

    preparedAt:
      new Date().toISOString()
  }
};
```

## 54. Kết nối chính xác

Phải nối:

```text
Prepare Published Folder Move
→ Move Newly Published Folder
→ Verify Published Folder Move
```

Đã ngắt kết nối:

```text
Prepare Published Folder Move
→ Move Already Published Folder
```

Không nối đồng thời hai node Move.

## 55. `Move Newly Published Folder`

Node type:

```text
Execute Command
```

`Execute Once`: OFF

Command ở chế độ Expression:

```javascript
{{
  'node -e "const fs=require(\'fs\');' +
  'const path=require(\'path\');' +
  'const src=process.argv[1];' +
  'const dst=process.argv[2];' +

  'if(fs.existsSync(dst)){' +
    'console.log(\'STATUS=ALREADY_MOVED\');' +
    'process.exit(0);' +
  '}' +

  'if(!fs.existsSync(src)){' +
    'console.log(\'STATUS=SOURCE_NOT_FOUND\');' +
    'process.exit(2);' +
  '}' +

  'fs.mkdirSync(path.dirname(dst),{recursive:true});' +
  'fs.renameSync(src,dst);' +

  'if(fs.existsSync(dst)){' +
    'console.log(\'STATUS=MOVED\');' +
    'process.exit(0);' +
  '}' +

  'console.log(\'STATUS=MOVE_FAILED\');' +
  'process.exit(4);' +

  '" "' + $json.sourceFolder + '" "' +
  $json.destinationFolder + '"'
}}
```

Kết quả thực tế:

- V889 đã chuyển thành công.
- `stdout` vẫn có thể rỗng:
  ```json
  {
    "exitCode": 0,
    "stderr": "",
    "stdout": ""
  }
  ```
- Không xem `stdout` rỗng là thất bại nếu:
  - `exitCode = 0`;
  - thư mục nguồn không còn;
  - thư mục đích tồn tại.

## 56. `Verify Published Folder Move`

Node type:

```text
Execute Command
```

Command ở chế độ Expression:

```javascript
{{
  'if not exist "' +
  $('Prepare Published Folder Move').item.json.sourceFolder +
  '" (' +
    'if exist "' +
    $('Prepare Published Folder Move').item.json.destinationFolder +
    '" ' +
    '(echo STATUS=MOVED_CONFIRMED) ' +
    'else (echo STATUS=DESTINATION_MISSING & exit /b 4)' +
  ') else (' +
    'echo STATUS=SOURCE_STILL_EXISTS & exit /b 3' +
  ')'
}}
```

Kết quả mong đợi:

```json
{
  "exitCode": 0,
  "stderr": "",
  "stdout": "STATUS=MOVED_CONFIRMED"
}
```

Nếu `stdout` vẫn rỗng nhưng thực tế thư mục đã chuyển, ưu tiên kiểm tra:

```text
inbox\<productCode> không tồn tại
published\<productCode> tồn tại
```

---

# PHẦN XIX — SẢN PHẨM ĐÃ TEST THÀNH CÔNG

## 57. A37

Thông tin:

```text
productCode: A37
productName: Heline Top
imageCount: 5
sizes: S, M, L, XL
price: 399000
salePrice: 349000
colors: Nâu, Đen, Be, Trắng
material: Chất liệu ren
notes: Hàng mới về
```

5 `PHOTO_ID` đã upload:

```text
1478352707654001
1478352670987338
1478352687654003
1478352750987330
1478352680987337
```

Feed:

```text
POST_ID:
864340803604548_1478367174319221
```

Story:

```text
post_id:
1048065934843610
```

Đã tạo:

```text
C:\Users\Admin\Desktop\facebook-agent\logs\A37-published.json
```

Đã chuyển:

```text
inbox\A37
→ published\A37
```

## 58. V889

Thông tin test:

- Mã sản phẩm:
  ```text
  V889
  ```
- Có 4 ảnh.
- Claude chạy thành công.
- Validate thành công.
- Upload đủ 4 ảnh.
- Feed nhiều ảnh thành công.
- Story thành công.
- Merge thành công.
- Build Actual Facebook Publish Result thành công.
- Tạo:
  ```text
  logs\V889-published.json
  ```
- Chuyển:
  ```text
  inbox\V889
  → published\V889
  ```
- Verify chuyển thư mục thành công.
- Feed POST_ID và Story POST_ID có trong file:
  ```text
  logs\V889-published.json
  ```
- ID cụ thể của V889 không được ghi lại trong nội dung cuộc trò chuyện, nhưng đã được lưu trong file published record trên máy.

## 59. Một sản phẩm mới hoàn toàn

Sau khi dọn các nhánh test và chỉnh luồng move:

- Đã chạy từ đầu đến cuối bằng `Manual Trigger`.
- Người dùng xác nhận:
  ```text
  Manual Trigger đã xong. Ổn từ đầu đến cuối.
  ```

Điều này xác nhận production flow cơ bản đang hoạt động end-to-end.

---

# PHẦN XX — CÁC LỖI ĐÃ GẶP VÀ CÁCH XỬ LÝ

## 60. PowerShell chặn npm

Lỗi:

```text
npm.ps1 cannot be loaded because running scripts is disabled
```

Giải pháp:

```bat
npm.cmd install -g n8n
```

Hoặc dùng CMD thay PowerShell.

## 61. Execute Command không lấy được stdout của Claude

Hiện tượng:

- Claude chạy.
- Terminal có output.
- n8n `stdout` rỗng.

Giải pháp:

- Không gọi Claude trực tiếp từ `Execute Command`.
- Dùng Claude Bridge HTTP local.

## 62. Claude viết thêm chữ trước JSON

Ví dụ:

```text
Dựa trên hình ảnh...
{"facebookCaption":"..."}
```

Giải pháp:

- Xóa code fence.
- Tìm JSON object đầu tiên.
- Parse object đó.

## 63. Claude Bridge trả kết quả ở cấu trúc khác

Hiện tượng:

- Claude đã `completed`.
- Node báo:
  ```text
  Claude không trả về nội dung
  ```

Nguyên nhân:

- Code chỉ đọc `$json.result`.

Giải pháp:

- Kiểm tra:
  ```text
  result
  data.result
  claude.result
  body.result
  body.claude.result
  ```

## 64. Caption thiếu mã sản phẩm

Giải pháp trong Validate:

```text
Nếu caption chưa chứa productCode:
→ tự thêm “Mã sản phẩm: <code>”
```

## 65. n8n không được đọc Desktop

Lỗi:

```text
Access to the file is not allowed.
Allowed paths: C:\Users\Admin/.n8n-files
```

Giải pháp:

```bat
set "N8N_RESTRICT_FILE_ACCESS_TO=C:\Users\Admin\Desktop\facebook-agent;C:\Users\Admin\.n8n-files"
```

## 66. Upload unpublished photo lỗi 403

Lỗi:

```text
(#200) Unpublished posts must be posted to a page as the page itself.
```

Nguyên nhân:

- Dùng User Access Token.

Giải pháp:

- Lấy token từ `/me/accounts`.
- Dùng đúng Page Access Token.
- Kiểm tra `/me` trả đúng Page Le’Coong.

## 67. Chạy node giữa workflow sau restart

Hiện tượng:

- Mất item linking.
- Không có context từ node trước.
- Node giữa luồng lỗi.

Giải pháp:

- Khởi động n8n và Bridge.
- Chạy lại từ `Manual Trigger`.
- Chỉ pin dữ liệu khi test có chủ đích.
- Trước khi production phải Unpin.

## 68. Code recovery bị dán nhầm vào node production

Node từng bị ảnh hưởng:

```text
Build Facebook Multi-Photo Request
```

Giải pháp:

- Đảm bảo node chứa code xây `facebookFeedBody`.
- Không chứa code phục hồi A37.

## 69. Node move trả stdout rỗng

Hiện tượng:

```json
{
  "exitCode": 0,
  "stderr": "",
  "stdout": ""
}
```

Nhưng thư mục đã chuyển.

Kết luận:

- Không phụ thuộc hoàn toàn vào `stdout`.
- Kiểm tra trạng thái file system.
- Dùng node Verify.
- Tách:
  - `Move Newly Published Folder`;
  - `Move Already Published Folder`.

## 70. Hai node cùng chuyển một thư mục

Nguy cơ:

```text
Prepare Published Folder Move
→ Move cũ
→ Move mới
```

Giải pháp cuối:

Sản phẩm mới:

```text
Prepare Published Folder Move
→ Move Newly Published Folder
→ Verify Published Folder Move
```

Sản phẩm đã đăng:

```text
Prepare Skipped Folder Move
→ Move Already Published Folder
```

---

# PHẦN XXI — QUY TẮC PIN DATA

## 71. Khi nào được pin

Chỉ pin khi:

- test riêng node Facebook;
- không muốn gọi lại Claude;
- cần phục hồi một lần chạy dang dở.

## 72. Trước khi test production

Phải Unpin các node production, đặc biệt:

```text
Validate Generated Content
Split Facebook Image Paths
Read Each Facebook Image
Upload Each Unpublished Facebook Photo
Collect Facebook Photo IDs
Build Facebook Multi-Photo Request
Publish Facebook Multi-Photo Post
Read Facebook Story Image
Upload Unpublished Facebook Story Photo
Publish Facebook Photo Story
Merge Facebook Publish Results
Build Actual Facebook Publish Result
Build Published Record
Convert Published Record to File
Save Published Record to Disk
Prepare Published Folder Move
Move Newly Published Folder
Verify Published Folder Move
```

Không để dữ liệu A37 hoặc V889 bị dùng cho sản phẩm mới.

---

# PHẦN XXII — TRẠNG THÁI SCHEDULE

## 73. Schedule Trigger đã thêm

Node:

```text
Schedule Every 3 Hours
```

Cấu hình:

```text
Trigger Interval: Hours
Hours Between Triggers: 3
Trigger at Minute: 0
```

Kết nối:

```text
Schedule Every 3 Hours
→ Scan Ready Products
```

Đồng thời vẫn giữ:

```text
Manual Trigger
→ Scan Ready Products
```

## 74. Việc cần xác nhận trước khi bật Active

1. Workflow đã Save.
2. Timezone của workflow/n8n là đúng Việt Nam:
   ```text
   Asia/Ho_Chi_Minh
   ```
3. n8n luôn chạy.
4. Claude Bridge luôn chạy.
5. Không còn node production bị pin.
6. Các node test đã ngắt kết nối.
7. `Manual Trigger` chạy end-to-end thành công.
8. `logs` và `published` đã được kiểm tra.
9. Sau đó mới bật:
   ```text
   Active
   ```

Tại thời điểm bàn giao:

- Node Schedule đã thêm.
- Chưa ghi nhận xác nhận cuối cùng rằng workflow đã bật Active.
- Bước hợp lý tiếp theo là kiểm tra timezone rồi bật Active.

---

# PHẦN XXIII — TRẠNG THÁI HIỆN TẠI

## 75. Đã hoàn thành

- [x] Cài n8n local.
- [x] Bật Execute Command.
- [x] Cho phép truy cập thư mục dự án.
- [x] Tạo cấu trúc thư mục.
- [x] Quét thư mục có `READY.ok`.
- [x] Xử lý nhiều đường dẫn sản phẩm.
- [x] Đọc `info.txt`.
- [x] Parse và validate dữ liệu sản phẩm.
- [x] Kiểm tra published record trước Claude.
- [x] Bỏ qua sản phẩm đã đăng.
- [x] Liệt kê JPG/JPEG/PNG.
- [x] Nhánh báo lỗi không có ảnh.
- [x] Claude Bridge local.
- [x] Claude Code đọc ảnh local.
- [x] Sinh caption, Story, image summary, hashtag.
- [x] Parse JSON robust.
- [x] Validate và chuẩn hóa nội dung.
- [x] Upload toàn bộ ảnh unpublished.
- [x] Gom `PHOTO_ID`.
- [x] Build `attached_media`.
- [x] Đăng Feed nhiều ảnh.
- [x] Đăng Facebook Photo Story.
- [x] Merge Feed + Story.
- [x] Tạo publish result.
- [x] Ghi `*-published.json`.
- [x] Chuyển sản phẩm mới sang `published`.
- [x] Verify việc chuyển thư mục.
- [x] Tách node move của sản phẩm mới và sản phẩm đã đăng.
- [x] Ngắt nhánh draft test.
- [x] Ngắt nhánh upload ảnh đầu tiên test.
- [x] Ngắt các node recovery A37 khỏi production.
- [x] Test A37 thành công.
- [x] Test V889 thành công.
- [x] Test sản phẩm mới end-to-end bằng Manual Trigger.
- [x] Thêm Schedule Trigger mỗi 3 giờ.
- [x] Giữ Manual Trigger song song.

## 76. Chưa hoàn thành hoặc chưa xác nhận

- [ ] Xác nhận timezone workflow.
- [ ] Bật workflow Active.
- [ ] Test một lượt thực tế do Schedule Trigger kích hoạt.
- [ ] Ghi error record khi không có ảnh.
- [ ] Chuyển sản phẩm lỗi sang `failed`.
- [ ] Xử lý lỗi Claude.
- [ ] Xử lý lỗi Meta.
- [ ] Retry có giới hạn.
- [ ] Chống partial success:
  - Feed thành công;
  - Story thất bại;
  - tránh đăng lại Feed.
- [ ] Cơ chế resume an toàn sau khi workflow dừng giữa chừng.
- [ ] Tự khởi động n8n cùng Windows.
- [ ] Tự khởi động Claude Bridge cùng Windows.
- [ ] Log tổng hợp theo ngày.
- [ ] Cảnh báo khi workflow lỗi.
- [ ] Dọn file tạm của Claude Bridge.
- [ ] Kiểm tra token hết hạn.
- [ ] Chuyển lên VPS sau khi local ổn định.
- [ ] Kiểm thử nhiều sản phẩm trong cùng một lượt schedule.
- [ ] Cải thiện item correlation khi nhiều sản phẩm chạy song song.

---

# PHẦN XXIV — BƯỚC TIẾP THEO ĐỀ XUẤT CHO CUỘC TRÒ CHUYỆN MỚI

## 77. Bước gần nhất

Tiếp tục từ trạng thái:

```text
Manual Trigger đã chạy end-to-end thành công.
Schedule Every 3 Hours đã được thêm và nối vào Scan Ready Products.
```

Bước tiếp theo:

1. Kiểm tra timezone:
   ```text
   Asia/Ho_Chi_Minh
   ```
2. Save workflow.
3. Bật Active.
4. Tạo một sản phẩm test mới.
5. Đợi Schedule Trigger tự chạy.
6. Kiểm tra:
   - Feed;
   - Story;
   - published record;
   - folder move;
   - execution log.
7. Không bấm Manual Trigger trong lượt test schedule.

## 78. Sau khi Schedule ổn định

Thứ tự nên làm:

1. Hoàn thiện nhánh `failed`.
2. Thiết kế partial success record.
3. Retry Claude.
4. Retry Meta.
5. Auto-start n8n.
6. Auto-start Claude Bridge.
7. Test nhiều sản phẩm.
8. Sau cùng mới cân nhắc VPS.

---

# PHẦN XXV — CHECKLIST VẬN HÀNH HẰNG NGÀY

## 79. Trước khi chạy

```text
[ ] n8n đang chạy
[ ] Claude Bridge đang chạy
[ ] Health endpoint trả ok
[ ] Page credential còn hiệu lực
[ ] Workflow Active
[ ] Không có node production bị pin
[ ] Node test không nối production
```

## 80. Khi thêm sản phẩm

```text
[ ] Tạo thư mục bằng productCode
[ ] Tạo info.txt
[ ] Thêm đủ ảnh
[ ] Kiểm tra định dạng ảnh
[ ] Tạo READY.ok cuối cùng
[ ] Không có published record trùng mã
```

## 81. Sau khi chạy

```text
[ ] Facebook Feed đã xuất hiện
[ ] Facebook Story đã xuất hiện
[ ] logs\<code>-published.json tồn tại
[ ] inbox\<code> không còn
[ ] published\<code> tồn tại
[ ] Execution không có node lỗi
```

---

# PHẦN XXVI — PROMPT KHỞI ĐỘNG CUỘC TRÒ CHUYỆN MỚI

Sao chép nguyên nội dung sau:

```text
Tôi đang tiếp tục dự án Facebook Auto Publisher local trên Windows.

Hãy đọc toàn bộ file bàn giao tôi vừa tải lên và xem đó là nguồn trạng thái chính xác của dự án.

Yêu cầu cách làm việc:
- Hướng dẫn từng bước rất nhỏ.
- Chỉ chuyển sang bước tiếp theo sau khi tôi xác nhận bước hiện tại thành công.
- Không yêu cầu tôi gửi Page Access Token.
- Không dùng Instagram.
- Không chuyển VPS ở giai đoạn này.
- Không nối lại các node test đã ngắt.
- Không chạy lại Claude hoặc Facebook nếu chưa cần.
- Luôn phân biệt luồng sản phẩm mới với luồng sản phẩm đã đăng.
- Khi sửa node, ghi rõ node type, cấu hình, expression/code và output mong đợi.

Trạng thái gần nhất:
- Manual Trigger đã chạy end-to-end thành công.
- Schedule Every 3 Hours đã được thêm và nối vào Scan Ready Products.
- Chưa xác nhận workflow đã Active.
- Bước tiếp theo là kiểm tra timezone Asia/Ho_Chi_Minh, bật Active và test một lượt do Schedule Trigger tự chạy.
```

---

# PHẦN XXVII — GHI CHÚ QUAN TRỌNG CHO TRỢ LÝ TIẾP THEO

1. Không gọi lại các node recovery A37.
2. Không nối lại `Read First Facebook Image`.
3. Không nối lại `Build Draft Content`.
4. Không nối `Prepare Published Folder Move` vào `Move Already Published Folder`.
5. Luồng đúng:
   ```text
   Prepare Published Folder Move
   → Move Newly Published Folder
   → Verify Published Folder Move
   ```
6. Luồng skipped:
   ```text
   Prepare Skipped Folder Move
   → Move Already Published Folder
   ```
7. `stdout` rỗng của node move không đồng nghĩa thất bại.
8. Trạng thái file system là nguồn xác nhận chính.
9. Published record là nguồn chống đăng trùng.
10. Không yêu cầu token từ người dùng.
11. Chỉ đưa một bước tiếp theo tại mỗi lượt hướng dẫn.
12. Khi test Schedule, không bấm Manual Trigger.
13. Khi xử lý nhiều sản phẩm, chú ý item linking và correlation theo `productCode`.
14. Không khẳng định Feed/Story chưa đăng nếu chưa kiểm tra published record và execution output.
15. Không chạy lại Facebook một cách mù quáng vì có nguy cơ đăng trùng.

---

# KẾT LUẬN BÀN GIAO

Hệ thống hiện đã đạt mốc:

```text
Sản phẩm mới trong inbox
→ đọc thông tin và ảnh
→ chống trùng
→ Claude tạo nội dung
→ upload toàn bộ ảnh
→ Facebook Feed nhiều ảnh
→ Facebook Story
→ lưu published record
→ chuyển sang published
```

Luồng đã được kiểm thử end-to-end bằng Manual Trigger.

Schedule mỗi 3 giờ đã được thêm. Phần gần nhất cần tiếp tục là:

```text
Kiểm tra timezone
→ bật Active
→ test Schedule Trigger thực tế
```
