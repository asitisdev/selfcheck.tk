var express = require("express");
var admin = require("firebase-admin");
var fetch = require("node-fetch");
var querystring = require("querystring");
var router = express.Router();
var ejs = require("ejs");

var serviceAccount = require("../serviceAccountKey.json");

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://selfcheck-19.firebaseio.com",
});

var db = defaultApp.firestore();

// 사용자 정보 검증
function getQstnCrtfcNoEncpt(schulCode, pName, frnoRidno) {
  return fetch(
    "https://eduro.goe.go.kr/stv_cvd_co00_012.do?" +
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

// 자가진단 실시
function sendResult(qstnCrtfcNoEncpt, schulNm, stdntName) {
  return fetch(
    "https://eduro.goe.go.kr/stv_cvd_co01_000.do?" +
      // "https://eduro.goe.go.kr/stv_cvd_co02_000.do?" +
      querystring.stringify({
        rtnRsltCode: "SUCCESS",
        qstnCrtfcNoEncpt: qstnCrtfcNoEncpt,
        schulNm: schulNm,
        stdntName: stdntName,
        rspns01: 1,
        rspns02: 1,
        rspns07: 0,
        rspns08: 0,
        rspns09: 0,
      }),
    {
      method: "POST",
      body: {
        rtnRsltCode: "SUCCESS",
        qstnCrtfcNoEncpt: qstnCrtfcNoEncpt,
        schulNm: schulNm,
        stdntName: stdntName,
        rspns01: 1,
        rspns02: 1,
        rspns07: 0,
        rspns08: 0,
        rspns09: 0,
      },
    }
  )
    .then((response) => response.json())
    .then((json) => {
      if (json.resultSVO.rtnRsltCode == "SUCCESS") {
        return "SUCCESS - " + stdntName + " | " + qstnCrtfcNoEncpt;
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
  res.render("find");
});

router.post("/add", function (req, res, next) {
  (async () => {
    let qstnCrtfcNoEncpt = await getQstnCrtfcNoEncpt(
      req.body.schulCode,
      req.body.name,
      req.body.birth
    );

    if (qstnCrtfcNoEncpt) {
      let data = {
        birth: req.body.birth,
        name: req.body.name,
        schulNm: req.body.schulNm,
        schulCode: req.body.schulCode,
        qstnCrtfcNoEncpt,
      };
      console.log(data);

      let list = db
        .collection("list")
        .add(data)
        .then((ref) => console.log("Added document with ID: ", ref.id));
      res.render("add");
    } else {
      res.redirect("/error");
    }
  })();
});

router.get("/run", function (req, res, next) {
  db.collection("list")
    .get()
    .then((snapshot) => {
      console.log("The size of list :", snapshot.size);
      snapshot.forEach((doc) => {
        console.log(doc.id, ": ", doc.data());
        let data = doc.data();
        (async () => {
          console.log(await sendResult(data.qstnCrtfcNoEncpt, data.schulNm, data.name));
        })();
      });
      res.redirect("/");
    })
    .catch((err) => {
      console.log("ERROR! ", err);
      res.redirect("/error");
    });
});

module.exports = router;
