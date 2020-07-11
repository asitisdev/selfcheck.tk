// Google Cloud Function 사용 index.js, serviceAccountKey.json, package.json 업로드
var admin = require("firebase-admin");
var fetch = require("node-fetch");
var querystring = require("querystring");

var serviceAccount = require("./serviceAccountKey.json");

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://selfcheck-19.firebaseio.com",
});

var db = defaultApp.firestore();

// 자가진단 실시
function sendResult(qstnCrtfcNoEncpt, schulNm, stdntName) {
  return fetch(
    "https://eduro.goe.go.kr/stv_cvd_co01_000.do?" +
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

function run(req, res) {
  db.collection("list")
    .get()
    .then((snapshot) => {
      global.log = `The size of list : ${snapshot.size}`;
      snapshot.forEach((doc) => {
        // global.log += `\n${doc.id}: ${doc.data()}`;
        global.log += `\n${doc.id}`;
        let data = doc.data();
        (async () => {
          global.log += "\n" + await sendResult(data.qstnCrtfcNoEncpt, data.schulNm, data.name);
        })();
      });
      res.send(global.log);
    })
    .catch((err) => {
      console.log("ERROR! ", err);
    });
}

exports.run = run;
