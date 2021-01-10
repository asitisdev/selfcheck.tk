const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const crypto = require("crypto");
const router = express.Router();
const ejs = require("ejs");

const serviceAccount = require("../serviceAccountKey.json");
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

// 사용자 정보 확인
function validateUser(orgCode, name, birthday, password) {
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
        throw new Error("User Information Error");
      } else {
        return data.token;
      }
    })
    .then((token) =>
      fetch("https://goehcs.eduro.go.kr/v2/validatePassword", {
        method: "POST",
        body: JSON.stringify({
          password: encrypt(password),
          deviceUuid: "",
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
        throw new Error("Password Error");
      } else {
        return true;
      }
    })
    .catch((error) => {
      console.log(error);
      return false;
    });
}

// 사용자 정보 가져오기
function getUserPNo(orgCode, name, birthday, password) {
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
        throw new Error("Password Validation Error");
      }
    })
    .then((token) =>
      fetch("https://goehcs.eduro.go.kr/v2/selectUserGroup", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          ...HEADER,
          Authorization: token,
        },
      })
    )
    .then((response) => response.json())
    .then((json) => json[0].userPNo)
    .catch((error) => {
      console.log(error);
      return undefined;
    });
}

/* GET home page. */
router.get("/", function (req, res, next) {
  ejs.renderFile("./views/index.ejs").then((content) => {
    res.render("template", { content });
  });
});

router.get("/find", function (req, res, next) {
  res.render("find", { q: req.query.q });
});

router.get("/privacy", function (req, res, next) {
  ejs.renderFile("./views/privacy.ejs").then((content) => {
    res.render("template", { content });
  });
});

router.post("/add", async function (req, res, next) {
  if (await validateUser(req.body.orgCode, req.body.name, req.body.birthday, req.body.password)) {
    const userPNo = await getUserPNo(req.body.orgCode, req.body.name, req.body.birthday, req.body.password);
    const students = db.collection("students");
    if (userPNo) {
      students
        .where("userPNo", "==", userPNo)
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            let data = {
              name: req.body.name,
              birthday: req.body.birthday,
              orgName: req.body.orgName,
              orgCode: req.body.orgCode,
              password: req.body.password,
              userPNo,
            };

            students.add(data).then((ref) => console.log("Added document with ID: ", ref.id));
            console.log(data);

            ejs.renderFile("./views/success.ejs").then((content) => {
              res.render("template", { content });
            });
          } else {
            ejs.renderFile("./views/conflict.ejs").then((content) => {
              res.render("template", { content });
            });
          }
        });
    } else {
      ejs.renderFile("./views/fail.ejs").then((content) => {
        res.render("template", { content });
      });
    }
  } else {
    ejs.renderFile("./views/fail.ejs").then((content) => {
      res.render("template", { content });
    });
  }
});

router.get("/test", function (req, res, next) {
  let page = req.query.p || "index";
  ejs.renderFile(`./views/${page}.ejs`).then((content) => {
    res.render("template", { content });
  });
});

module.exports = router;
