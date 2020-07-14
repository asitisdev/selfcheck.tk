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
