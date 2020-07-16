// Google Cloud Function 사용 index.js, serviceAccountKey.json, package.json 업로드
var admin = require("firebase-admin");
var fetch = require("node-fetch");
var querystring = require("querystring");

var URL = {
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

var serviceAccount = require("./serviceAccountKey.json");

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://selfcheck-19.firebaseio.com",
});

var db = defaultApp.firestore();

// 자가진단 실시
function sendResult(qstnCrtfcNoEncpt, schulNm, stdntName, schulCode) {
  return fetch(
    URL[schulCode.charAt(0)] + "/stv_cvd_co01_000.do?" +
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
          global.log += "\n" + await sendResult(data.qstnCrtfcNoEncpt, data.schulNm, data.name, data.schulCode);
        })();
      });
      console.log("Done!");
      res.send(global.log);
    })
    .catch((err) => {
      console.log("ERROR! ", err);
    });
}

exports.run = run;
