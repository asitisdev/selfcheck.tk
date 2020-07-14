var express = require("express");
var admin = require("firebase-admin");
var fetch = require("node-fetch");
var querystring = require("querystring");
var router = express.Router();
var ejs = require("ejs");

const URL = {
  B: "https://eduro.sen.go.kr",  // 서울
  J: "https://eduro.goe.go.kr",  // 경기
  G: "https://eduro.dje.go.kr",  // 대전
  D: "https://eduro.dge.go.kr",  // 대구
  C: "https://eduro.pen.go.kr",  // 부산
  E: "https://eduro.ice.go.kr",  // 인천
  F: "https://eduro.gen.go.kr",  // 광주
  H: "https://eduro.use.go.kr",  // 울산
  I: "https://eduro.sje.go.kr",  // 세종
  M: "https://eduro.cbe.go.kr",  // 충북
  N: "https://eduro.cne.go.kr",  // 충남
  R: "https://eduro.gbe.kr",     // 경북
  S: "https://eduro.gne.go.kr",  // 경남
  K: "https://eduro.kwe.go.kr",  // 강원
  P: "https://eduro.jbe.go.kr",  // 전북
  Q: "https://eduro.jne.go.kr",  // 전남
  T: "https://eduro.jje.go.kr"   // 제주
}

const serviceAccount = require("../serviceAccountKey.json");
const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://selfcheck-19.firebaseio.com",
});
const db = defaultApp.firestore();

// 사용자 정보 검증
function getQstnCrtfcNoEncpt(schulCode, pName, frnoRidno) {
  return fetch(
    URL[schulCode.charAt(0)] + "/stv_cvd_co00_012.do?" +
      querystring.stringify({
        schulCode: schulCode,
        pName: pName,
        frnoRidno: frnoRidno,
      }),
    {
      method: "POST",
      body: {
        schulCode: schulCode,
        pName: pName,
        frnoRidno: frnoRidno,
      },
    }
  )
    .then((response) => {
      if (response) {
        return response.json();
      } else {
        return undefined;
      }
    })
    .then((json) => {
      if (json.resultSVO.rtnRsltCode == "SUCCESS") {
        console.log("SUCCESS");
        return json.resultSVO.qstnCrtfcNoEncpt;
      } else {
        return undefined;
      }
    })
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

router.post("/add", function (req, res, next) {
  (async () => {
    let qstnCrtfcNoEncpt = await getQstnCrtfcNoEncpt(
      req.body.schulCode,
      req.body.name,
      req.body.birth
    );

    let list = db.collection("list");

    if (qstnCrtfcNoEncpt) {
      list
        .where("qstnCrtfcNoEncpt", "==", qstnCrtfcNoEncpt)
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            let data = {
              birth: req.body.birth,
              name: req.body.name,
              schulNm: req.body.schulNm,
              schulCode: req.body.schulCode,
              qstnCrtfcNoEncpt,
            };

            list.add(data).then((ref) => console.log("Added document with ID: ", ref.id));
            ejs.renderFile("./views/success.ejs").then((content) => {
              res.render("template", { content });
            });

            console.log(data);
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
  })();
});

router.get("/test", function (req, res, next) {
  let page = req.query.p || "index";
  ejs.renderFile(`./views/${page}.ejs`).then((content) => {
    res.render("template", { content });
  });
});

module.exports = router;
