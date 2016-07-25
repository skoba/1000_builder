//------------------------------------------------------------------
// Global object app context
//------------------------------------------------------------------
var appCtx = {
    access_token: '',           // アクセストークン
    expires_in: 0,              // トークンの有効期間（秒）このデモでは使用しない
    test_results: []            // デモ固有で検査結果を格納する配列
};

//------------------------------------------------------------------
// Simpleデータ及びMMLを表示するDOM
//------------------------------------------------------------------
var simpleBox = function () {
    return document.getElementById('simple_box');
};

var mmlBox = function () {
    return document.getElementById('mml_box');
};

//------------------------------------------------------------------
// Client Credentials Grant flow of the OAuth 2 specification
// https://tools.ietf.org/html/rfc6749#section-4.4
// Must use HTTPS endpoints in production
// consumer key and secret below are invalid in production stage
//------------------------------------------------------------------
var getAccessToken = function (callback) {
    var xhr = new XMLHttpRequest();
    // プロジェクトから支給された consumer key
    var consumerKey = 'xvz1evFS4wEEPTGEFPHBog';
    // プロジェクトから支給された secret
    var secret = 'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg';
    // 上記二つをコロンで連結し base64 でエンコードする
    var base64 = btoa(consumerKey + ':'　+　secret);
    // ポストするデータは grant_type=client_credentials で URL エンコードする
    var data = encodeURI('grant_type=client_credentials');
    // ポスト先は /oauth2/token
    xhr.open('POST', '/oauth2/token', true);
    // Basic 認証用の HTTP Header をセットする
    xhr.setRequestHeader('Authorization', 'Basic ' + base64);
    // Content type は application/x-www-form-urlencoded
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=utf-8');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status < 200 || xhr.status > 299) {
                // HTTP Status が200番台でない時
                var err = JSON.parse(xhr.responseText);
                alert(new Error(err.error + ' ' + xhr.status));
                callback(err);
            } else {
                // レスポンスをパースしてJSONを得る {token_type: 'bearer', access_token: ''トークン'', expires_in: ''有効期間秒''}
                var token = JSON.parse(xhr.responseText);
                if (token.token_type === 'bearer' && token.hasOwnProperty('access_token')) {
                    // tokenをappCtxに保存
                    appCtx.access_token = token.access_token;
                    appCtx.expires_in = token.expires_in;
                    callback(null);
                } else {
                    alert(new Error('Unexpected server response'));
                    callback(err);
                }
            }
        }
    }
    xhr.send(data);
};

//------------------------------------------------------------------
// 1000-builderへsimpleCompositionをポストする
//------------------------------------------------------------------
var post = function (simpleComposition) {
    var xhr = new XMLHttpRequest();
    // ポスト先 /1000/simple/v1
    xhr.open('POST', '/1000/simple/v1', true);
    // Authorizationヘッダーを Bearer access_token にセットする
    xhr.setRequestHeader('Authorization', 'Bearer ' + appCtx.access_token);
    // contentType = json
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status > 199 && xhr.status < 300) {
                // response = 200, responseからJSONを生成する
                var data = JSON.parse(xhr.responseText);
                // 結果はMML(XML) なので 'pretty print する
                mmlBox().innerHTML = prettyXml(data.mml);
            } else if (xhr.status > 399 && xhr.status < 500) {
                // 400, 401, 403 access tokenが失効しているかemptyなので再取得
                getAccessToken(function(err) {
                    if (!err) {
                        // 取得できたら再帰してpostする
                        post(simpleComposition);
                    }
                });
            } else {
                alert(new Error(xhr.status));
            }
        }
    }
    xhr.send(JSON.stringify(simpleComposition));
};

// 患者
var simplePatient = {
    id: '0516',                                        // 施設(病院)内で発番されている患者Id
    idType: 'facility',                                // 施設固有のIdであることを示す
    facilityId: 'JPN012345678901',                     // 医療連携等のために施設に振られているId
    kanjiName: '宮田 奈々',                             // 漢字の氏名
    kanaName: 'ミヤタ ナナ',                             // カナ
    romanName: 'Nana Miyata',                          // ローマ字
    gender: 'femail',                                  // MML0010(女:femail 男:male その他:other 不明:unknown)
    dateOfBirth: '1994-11-26',                         // 生年月日
    maritalStatus: 'single',                           // 婚姻状況 MML0011を使用 オプション
    nationality: 'JPN',                                // 国籍 オプション
    postalCode: '000-0000',                            // 郵便番号
    address: '横浜市中区日本大通り 1-23-4-567',            // 住所
    telephone: '054-078-7934',                         // 電話番号
    mobile: '090-2710-1564',                           // モバイル
    email: 'miyata_nana@example.com'                   // 電子メール オプション
};

// 医師等
var simpleCreator = {
    id: '201605',                                      // 施設で付番されている医師のId
    idType: 'facility',                                // 施設固有のIdであることを示す
    kanjiName: '青山 慶二',                             // 医師名
    prefix: 'Professor',                               // 肩書き等 オプション
    degree: 'MD/PhD',                                  // 学位 オプション
    facilityId: 'JPN012345678901',                     // 医療連携等のために施設に振られているId
    facilityIdType: 'JMARI',                           // 上記施設IDを発番している体系 MML0027(ca|insurance|monbusho|JMARI|OID)から選ぶ
    facilityName: 'シルク内科',                          // 施設名
    facilityZipCode: '231-0023',                       // 施設郵便番号
    facilityAddress: '横浜市中区山下町1番地 8-9-01',      // 施設住所
    facilityPhone: '045-571-6572',                     // 施設電話番号
    departmentId: '01',                                // 医科用:MML0028 歯科用:MML0030 から選ぶ
    departmentIdType: 'medical',                       // 医科用の診療科コード:medical 歯科用の診療科コード:dental を指定 MML0029(medical|dental|facility)から選ぶ
    departmentName: '第一内科',                         // 診療科名
    license: 'doctor'                                  // 医療資格 MML0026から選ぶ
};

// 処方せん
var simplePrescription = function () {
    // 服薬開始日
    var startDate = nowAsDate();                        // YYYY-MM-DD
    // リターンする simplePrescription
    var simple = {
        contentType: 'Medication',                      // Medication
        medication: []                                  // 処方の配列
    };

    var med = {
        issuedTo: 'external',                           // 院外処方: external 院内処方: internal
        medicine: 'マーズレン S 顆粒',                    // 処方薬
        medicineCode: '612320261',                      // 処方薬のコード
        medicineCodeSystem: 'YJ',                       // コード体系
        dose: 1,                                        // 1回の量
        doseUnit: 'g',                                  // 単位
        frequencyPerDay: 2,                             // 1日の内服回数
        startDate: startDate,                           // 服薬開始日 YYYY-MM-DD
        duration: 'P30D',                               // 30日分
        instruction: '内服2回 朝夜食後に',                 // 用法
        PRN: false,                                     // 頓用=false
        brandSubstitutionPermitted: true,               // ジェネリック可
        longTerm: false                                 // 臨時処方
    };
    simple.medication.push(med);                        // 配列へ格納

    med = {
        issuedTo: 'external',                           // 院外処方: external 院内処方: internal
        medicine: 'メトリジン錠 2 mg',                    // 処方薬
        medicineCode: '612160027',                      // 処方薬のコード
        medicineCodeSystem: 'YJ',                       // コード体系
        dose: 2,                                        // 1回の量
        doseUnit: '錠',                                 // 単位
        frequencyPerDay: 2,                             // 1日の内服回数
        startDate: startDate,                           // 服薬開始日
        duration: 'P30D',                               // 30日分
        instruction: '内服2回 朝夜食後に',                 // 用法
        PRN: false,                                     // 頓用=false
        brandSubstitutionPermitted: false,              // ジェネリック不可
        longTerm: true                                  // 長期処方
    };
    simple.medication.push(med);                        // 配列へ格納

    return simple;
};

// 注射
var simpleInjection = function () {
    // 生成する simpleInjection
    var simple = {
        contentType: 'Injection',                       // Injection
        medication: []                                  // 処方の配列
    };
    // 投与開始日時
    var start = new Date();                             // 投与開始日時
    var end = new Date();
    end.setHours(start.getHours() + 2);                 // 投与終了日時
    var med = {
        medicine: 'ラクテック 500ml',                     // 薬剤名称
        medicineCode: '12304155',                       // 薬剤コード
        medicineCodeystem: 'YJ',                        // コード体系
        dose: '500',                                    // 用量
        doseUnit: 'ml',                                 // 単位
        startDateTime: toDateTimeString(start),         // 投与開始日時 YYYY-MM-DDTHH:mm:ss
        endDateTime: toDateTimeString(end),             // 投与終了日時 YYYY-MM-DDTHH:mm:ss
        instruction: '2時間で投与する',                    // 用法指示
        route: '右前腕静脈ルート',                         // 投与経路
        site: '右前腕',                                  // 投与部位
        deliveryMethod: '点滴静注',                       // 注射方法
        batchNo: '1'                                    // 処方番号
    };
    simple.medication.push(med);
    med = {
        medicine: 'ビタメジン静注用',                      // 薬剤名称
        medicineCode: '553300555',                      // 薬剤コード
        medicineCodeystem: 'YJ',                        // コード体系
        dose: '1',
        doseUnit: 'V',
        batchNo: '1'
    };
    simple.medication.push(med);
    // 投与開始、終了日時
    start = new Date();                                 // 投与開始日時
    end = new Date();
    end.setHours(start.getHours() + 1);                 // 投与終了日時
    med = {
        medicine: 'セファメジンα 2g キット',               // 薬剤名称
        medicineCode: '14433344',                       // 薬剤コード
        medicineCodeystem: 'YJ',                        // コード体系
        dose: '1',                                      // 用量
        doseUnit: 'V',                                  // 単位
        startDateTime: toDateTimeString(start),         // 投与開始日時 YYYY-MM-DDTHH:mm:ss
        endDateTime: toDateTimeString(end),             // 投与終了日時 YYYY-MM-DDTHH:mm:ss
        instruction: '1時間で投与する',                    // 用法指示
        route: '右前腕静脈ルート',                         // 投与経路
        site: '右前腕',                                   // 投与部位
        deliveryMethod: '点滴静注',                       // 注射方法
        batchNo: '1'                                    // 処方番号
    };
    simple.medication.push(med);
    return simple;
};

// 病名
// 1病名毎に1モジュール
var simpleDiagnosis = function () {
    var now = new Date();
    var dateOfRemission = toDateString(now);                // 終了日 = 今
    now.setDate(now.getDate() - 30);                        // 30日前が
    var dateOfOnset = toDateString(now);                    // 開始日

    return {
        contentType: 'Medical Diagnosis',                   // Medical Diagnosis
        diagnosis: 'colon carcinoid',
        code: 'C189-.006',
        system: 'ICD10',
        category: 'mainDiagnosis',
        dateOfOnset: dateOfOnset,
        dateOfRemission: dateOfRemission,
        outcome: 'fullyRecovered'
    };
};

// ファイルコンテンツ(test_result.csv)から検査項目リストを生成する下請け
var createTestItems = function (content) {
    var items = [];
    var lineArray = [];
    var simpleItem = {};
    // リターン区切りでline by line
    var lines = content.split("\n");
    // 最初の行はヘッダーなので除く
    lines.shift();
    lines.every(function (entry, index, lines) {
        if (entry === '') {
            return false;
        }
        // この行をカンマ区切りで配列に格納する
        lineArray = entry.split(/\s*,\s*/);
        // この行のテスト項目
        simpleItem = {
            spcCode: lineArray[0],                      // 検体コード
            spcName: lineArray[1],                      // 検体名
            code: lineArray[2],                         // コード
            name: lineArray[3],                         // テスト項目名
            value: lineArray[4]                         // 結果値
        };
        if (lineArray[5] !== '') {
            simpleItem.unit = lineArray[5];              // 単位
        }
        if (lineArray[6] !== '' ) {
            simpleItem.lowerLimit = lineArray[6];        // 下限値
        }
        if (lineArray[7] !== '' ) {
            simpleItem.upperLimit = lineArray[7];        // 上限値
        }
        if (lineArray[8] !== '' ) {
            simpleItem.out = lineArray[8];               // 判定フラグ
        }
        if (lineArray[9] !== '' && lineArray[10] !== '') {
            simpleItem.memoCode = lineArray[9];          // メモコード
            simpleItem.memo = lineArray[10];             // メモ
        }
        items.push(simpleItem);
        return true;
    });
    return items;
};

// 検査
var simpleLabTest = function (callback) {
    var laboratoryTest = {
        contentType: 'Laboratory Report',
        context: {
            issuedId: uuid.v4(),                            // 検査Id 　運用で決める
            issuedTime: nowAsDateTime(),                    // 受付日時
            resultIssued: nowAsDateTime(),                  // 報告日時
            resultStatus: '最終報告',                        // 報告状態
            resultStatusCode: 'final',                      // 報告状態コード  検査中:mid  最終報告:final
            codeSystem: 'YBS_2016',                         // 検査コード体系名
            facilityName: simpleCreator.facilityName,       // 検査依頼施設
            facilityId: simpleCreator.facilityId,           // 検査依頼施設
            facilityIdType: 'JMARI',                        // 検査依頼施設
            laboratory: {
                id: '303030',                                // 検査実施会社内での Id
                idType: 'facility',                          // 施設で付番されているIdであることを示す
                kanjiName: '石山 由美子',                      // 検査実施施設の代表 代表とは?
                facilityId: '1.2.3.4.5.6.7890.1.2',          // OID
                facilityIdType: 'OID',                       // MML0027 OID 方式
                facilityName: 'ベイサイド・ラボ',               // 検査実施会社の名称
                facilityZipCode: '231-0000',                 // 検査実施会社の郵便番号
                facilityAddress: '横浜市中区スタジアム付近 1-5', // 検査実施会社の住所
                facilityPhone: '045-000-0072',               // 検査実施会社の電話
                license: 'lab'                               // MML0026 他に?
            }
        }
    };
    if (appCtx.test_results.length > 0) {
        laboratoryTest.testResult = appCtx.test_results;
        callback(laboratoryTest);
    } else {
        // 検査結果ファイルを読み込んで
        var xhr = new XMLHttpRequest();
        xhr.open("GET", '/test_result.csv', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status/100 === 2) {
                // 検査結果オブジェクトを生成する
                var items = createTestItems(xhr.responseText);
                items.forEach (function (entry) {
                    appCtx.test_results.push(entry);
                });
                laboratoryTest.testResult = appCtx.test_results;
                callback(laboratoryTest);
            }
        }
        xhr.send();
    }
};

// Vital Sign
var simpleVitalSign = function () {
    var vitalSign = {
        contentType: 'Vital Sign',
        context: {
            observer: '花田 綾子',
        },
        item: [],
        observedTime: nowAsDateTime(),
        protocol: {
            position: 'sitting',         // mmlVs03
            device: 'Apple Watch',
            bodyLocation: '右腕'
        }
    };
    // 収縮期血圧
    vitalSign.item.push({
        itemName: 'Systolic blood pressure',    // mmlVs01
        numValue: 135,
        unit: 'mmHg'                            // mmlVs02
    });
    // 拡張期血圧
    vitalSign.item.push({
        itemName: 'Diastolic blood pressure',   // mmlVs01
        numValue: 80,
        unit: 'mmHg'                            // mmlVs02
    });
    return vitalSign;
};

// 処方情報をセットする
var showPrescription = function () {
    // staffs
    var prescription = simplePrescription();    // 処方せん
    var confirmDate = nowAsDateTime();          // このMMLの確定日はこの時点 YYYY-MM-DDTHH:mm:ss
    var uid = uuid.v4();                        // MML文書の UUID
    var simpleComposition = {                   // POST = simpleComposition
        context: {                              // 文脈
            uuid: uid,                          // UUID
            confirmDate: confirmDate,           // 確定日時 YYYY-MM-DDTHH:mm:ss
            patient: simplePatient,             // 患者
            creator: simpleCreator              // 医師
        },
        content: [prescription]                 // 臨床データ
    };
    // 表示
    var arr = [];
    arr.push('<pre>');
    arr.push('// 患者');
    arr.push('\n');
    arr.push('var simplePatient = ');
    arr.push(prettyJSON(simplePatient));
    arr.push(';');
    arr.push('\n');
    arr.push('// 医師');
    arr.push('\n');
    arr.push('var simpleCreator = ');
    arr.push(prettyJSON(simpleCreator));
    arr.push(';');
    arr.push('\n');
    arr.push('// 処方せん');
    arr.push('\n');
    arr.push('var simplePrescription = ');
    arr.push(prettyJSON(prescription));
    arr.push(';');
    arr.push('</pre>');
    var text = arr.join('');
    simpleBox().innerHTML = text;
    // POST する
    post(simpleComposition);
};

// 処方情報をセットする
var showInjection = function () {
    // staffs
    var injection = simpleInjection();          // 注射記録
    var confirmDate = nowAsDateTime();          // このMMLの確定日はこの時点 YYYY-MM-DDTHH:mm:ss
    var uid = uuid.v4();                        // MML文書の UUID
    var simpleComposition = {                   // send = simpleComposition
        context: {
            uuid: uid,                          // UUID
            confirmDate: confirmDate,           // 確定日時 YYYY-MM-DDTHH:mm:ss
            patient: simplePatient,             // 患者
            creator: simpleCreator              // 医師
        },
        content: [injection]                    // content: [injection]
    };
    // 表示
    var arr = [];
    arr.push('<pre>');
    arr.push('// 患者');
    arr.push('\n');
    arr.push('var simplePatient = ');
    arr.push(prettyJSON(simplePatient));
    arr.push(';');
    arr.push('\n');
    arr.push('// 医師');
    arr.push('\n');
    arr.push('var simpleCreator = ');
    arr.push(prettyJSON(simpleCreator));
    arr.push(';');
    arr.push('\n');
    arr.push('// 注射記録');
    arr.push('\n');
    arr.push('var simpleInjection = ');
    arr.push(prettyJSON(injection));
    arr.push(';');
    arr.push('</pre>');
    var text = arr.join('');
    simpleBox().innerHTML = text;
    // send する
    post(simpleComposition);
};

// 病名情報をセットする
var showDiagnosis = function () {
    // staffs
    var diagnosis = simpleDiagnosis();          // 病名
    var confirmDate = nowAsDateTime();          // 確定日はこの時点　YYYY-MM-DDTHH:mm:ss
    var uid = uuid.v4();                        // MML文書の UUID
    var simpleComposition = {                   // POST = simpleComposition
        context: {
            uuid: uid,                          // UUID
            confirmDate: confirmDate,           // 確定日時 YYYY-MM-DDTHH:mm:ss
            patient: simplePatient,             // 患者
            creator: simpleCreator              // 医師
        },
        content: [diagnosis]                    // 中身をこのdiagnosisにする
    };
    // 表示
    var arr = [];
    arr.push('<pre>');
    arr.push('// 患者');
    arr.push('\n');
    arr.push('var simplePatient = ');
    arr.push(prettyJSON(simplePatient));
    arr.push(';');
    arr.push('\n');
    arr.push('// 医師');
    arr.push('\n');
    arr.push('var simpleCreator = ');
    arr.push(prettyJSON(simpleCreator));
    arr.push(';');
    arr.push('\n');
    arr.push('// 病名');
    arr.push('\n');
    arr.push('var simpleDiagnosis = ');
    arr.push(prettyJSON(diagnosis));
    arr.push(';');
    arr.push('</pre>');
    var text = arr.join('');
    simpleBox().innerHTML = text;
    // POST する
    post(simpleComposition);
};

// 検査情報をセットする
var showLabTest = function () {

    simpleLabTest (function (simpleTest) {
        // staffs
        var confirmDate = simpleTest.resultIssued;  // 検体検査の場合、確定日は報告日 YYYY-MM-DDTHH:mm:ss
        var uid = uuid.v4();                        // MML文書の UUID
        var simpleComposition = {                   // POST = simpleComposition
            context: {
                uuid: uid,                          // UUID
                confirmDate: confirmDate,           // 確定日時 YYYY-MM-DDTHH:mm:ss
                patient: simplePatient,             // 患者
                creator: simpleCreator              // 医師
            },
            content: [simpleTest]                   // 中身をこのsimpleTestにする
        };
        // 表示
        var arr = [];
        arr.push('<pre>');
        arr.push('// 患者');
        arr.push('\n');
        arr.push('var simplePatient = ');
        arr.push(prettyJSON(simplePatient));
        arr.push(';');
        arr.push('\n');
        arr.push('// 医師');
        arr.push('\n');
        arr.push('var simpleCreator = ');
        arr.push(prettyJSON(simpleCreator));
        arr.push(';');
        arr.push('\n');
        arr.push('// 検査');
        arr.push('\n');
        arr.push('var simpleTest = ');
        arr.push(prettyJSON(simpleTest));
        arr.push(';');
        arr.push('</pre>');
        var text = arr.join('');
        simpleBox().innerHTML = text;
        // POST する
        post(simpleComposition);
    });
};

// バイタルサイン情報をセットする
var showVitalSign = function () {
    // staffs
    var vitalSign = simpleVitalSign();          // バイタルサイン
    var confirmDate = nowAsDateTime();          // 確定日はこの時点　YYYY-MM-DDTHH:mm:ss
    var uid = uuid.v4();                        // MML文書の UUID
    var simpleComposition = {                   // POST = simpleComposition
        context: {
            uuid: uid,                          // UUID
            confirmDate: confirmDate,           // 確定日時 YYYY-MM-DDTHH:mm:ss
            patient: simplePatient,             // 患者
            creator: simpleCreator              // 医師
        },
        content: [vitalSign]                    // 中身をこのvitalSignにする
    };
    // 表示
    var arr = [];
    arr.push('<pre>');
    arr.push('// 患者');
    arr.push('\n');
    arr.push('var simplePatient = ');
    arr.push(prettyJSON(simplePatient));
    arr.push(';');
    arr.push('\n');
    arr.push('// 医師');
    arr.push('\n');
    arr.push('var simpleCreator = ');
    arr.push(prettyJSON(simpleCreator));
    arr.push(';');
    arr.push('\n');
    arr.push('// バイタルサイン');
    arr.push('\n');
    arr.push('var simpleVitalSign = ');
    arr.push(prettyJSON(vitalSign));
    arr.push(';');
    arr.push('</pre>');
    var text = arr.join('');
    simpleBox().innerHTML = text;
    // POST する
    post(simpleComposition);
};

// selectionが変更された
var changeModule = function (selection) {
    window[selection.value]();
};
