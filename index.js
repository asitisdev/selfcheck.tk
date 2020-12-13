// Google Cloud Function 사용(Node12 Beta) index.js, serviceAccountKey.json, package.json 업로드
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const crypto = require("crypto");

const serviceAccount = require("./serviceAccountKey.json");
const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://selfcheck-19.firebaseio.com",
});
const db = defaultApp.firestore();

const KEY =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA81dCnCKt0NVH7j5Oh2+S\n" +
  "GgEU0aqi5u6sYXemouJWXOlZO3jqDsHYM1qfEjVvCOmeoMNFXYSXdNhflU7mjWP8\n" +
  "jWUmkYIQ8o3FGqMzsMTNxr+bAp0cULWu9eYmycjJwWIxxB7vUwvpEUNicgW7v5nC\n" +
  "wmF5HS33Hmn7yDzcfjfBs99K5xJEppHG0qc+q3YXxxPpwZNIRFn0Wtxt0Muh1U8a\n" +
  "vvWyw03uQ/wMBnzhwUC8T4G5NclLEWzOQExbQ4oDlZBv8BM/WxxuOyu0I8bDUDdu\n" +
  "tJOfREYRZBlazFHvRKNNQQD2qDfjRz484uFs7b5nykjaMB9k/EJAuHjJzGs9MMMW\n" +
  "tQIDAQAB\n" +
  "-----END PUBLIC KEY-----";

const HEADER = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "Accept": "*/*",
};

// RSA PKCS1 암호화
function encrypt(original) {
  return crypto
    .publicEncrypt(
      { key: KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(original, "utf8")
    )
    .toString("base64");
}

// 자가진단 실시
function sendResult(orgCode, name, birthday, userPNo, password) {
  return fetch("https://goehcs.eduro.go.kr/v2/findUser", {
    method: "POST",
    body: JSON.stringify({
      loginType: "school",
      orgCode: orgCode,
      birthday: encrypt(birthday),
      name: encrypt(name),
      stdntPNo: null,
    }),
    headers: HEADER,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.isError == true) {
        console.log(data);
        console.log(name, birthday, orgCode, userPNo, password);
        throw new Error("User Information Error");
      } else {
        return data.token;
      }
    })
    .then((token) =>
      fetch("https://goehcs.eduro.go.kr/v2/validatePassword", {
        method: "POST",
        body: JSON.stringify({
          deviceUuid: "",
          password: encrypt(password),
        }),
        headers: {
          ...HEADER,
          Authorization: token,
        },
      })
    )
    .then((response) => response.text())
    .then((data) => {
      const token = data.slice(1, -1);
      if (token.startsWith("Bearer")) {
        return token;
      } else {
        console.log(name, birthday, orgCode, userPNo, password);
        throw new Error("Password Validation Error");
      }
    })
    .then((token) =>
      fetch("https://goehcs.eduro.go.kr/v2/getUserInfo", {
        method: "POST",
        body: JSON.stringify({
          orgCode: orgCode,
          userPNo: userPNo,
        }),
        headers: {
          ...HEADER,
          Authorization: token,
        },
      })
    )
    .then((response) => response.json())
    .then((data) => {
      if (data.isError == true) {
        console.log(data);
        console.log(name, birthday, orgCode, userPNo, password);
        throw new Error("User Information Error");
      } else {
        return data.token;
      }
    })
    .then((token) =>
      fetch("https://goehcs.eduro.go.kr/registerServey", {
        // 설문 제출
        method: "POST",
        body: JSON.stringify({
          deviceUuid: "",
          rspns00: "Y",
          rspns01: "1",
          rspns02: "1",
          rspns03: null,
          rspns04: null,
          rspns05: null,
          rspns06: null,
          rspns07: null,
          rspns08: null,
          rspns09: "0",
          rspns10: null,
          rspns11: null,
          rspns12: null,
          rspns13: null,
          rspns14: null,
          rspns15: null,
          upperToken: token,
          upperUserNameEncpt: name,
        }),
        headers: {
          ...HEADER,
          Authorization: token,
        },
      })
    )
    .then((response) => response.json())
    .then((json) => console.log(`${json.registerDtm} ${name} 자가진단 완료`))
    .catch((error) => {
      console.log(error);
      return false;
    });
}

function run(req, res) {
  db.collection("students")
    .get()
    .then(async (snapshot) => {
      global.log = `The size of list : ${snapshot.size}`;
      await Promise.allSettled(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return sendResult(data.orgCode, data.name, data.birthday, data.userPNo, data.password);
        })
      );
      res.send(global.log);
    })
    .catch((err) => {
      console.log("ERROR! ", err);
    });
}

exports.run = run;
