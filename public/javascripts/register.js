$(() => {
  
  // 前後に空白を含まない半角英数文字かを判別。
  function isAscii(str) {
    str = (str === null) ? "" : str;
    if (str.match(/^[\x20-\x7e]+$/)) return true;
    else return false;
  }

  // パスワードの表示・非表示。
  $(document).on("change", "#password-display-switch", () => {
    if ($("#password-display-switch").prop("checked")) {
      // 表示。
      $("#password").attr("type", "text");
      $("#password-for-confirm").attr("type", "text");
    } else {
      // 非表示。
      $("#password").attr("type", "password");
      $("#password-for-confirm").attr("type", "password");
    }
  });

  // formの内容が変わるたびに確認。
  $(document).on("change", ".form-control", (e) => {
    let submitBtnflag = true;

    let target = $(e.target);
    // 内容に応じて警告を出す。
    switch (target.attr("name")) {
      case "user-id":
        $(".alert.alert-danger.1").hide();
        if (target.val() === "") {
          $("#alert-user-id-1-1").show();
        } else if (target.val().startsWith(" ") || target.val().endsWith(" ")) {
          $("#alert-user-id-1-2").show();
        } else if (!isAscii(target.val())) {
          $("#alert-user-id-1-3").show();
        }
        break;
      case "password":
        $(".alert.alert-danger.2").hide();
        $(".alert.alert-danger.3").hide();
        if (target.val() === "") {
          $("#alert-password-1-1").show();
        } else if (target.val().startsWith(" ") || target.val().endsWith(" ")) {
          $("#alert-password-1-2").show();
        } else if (!isAscii(target.val())) {
          $("#alert-password-1-3").show();
        } else if ($("#password-for-confirm").val() != "" && target.val() != $("#password-for-confirm").val()) {
          $("#alert-password-2-2").show();
        }
        break;
      case "password-for-confirm":
        $(".alert.alert-danger.3").hide();
        if (target.val() === "") {
          $("#alert-password-2-1").show();
        } else if (target.val() != $("#password").val()) {
          $("#alert-password-2-2").show();
        }
        break;
    }

    // 内容が全て入力されてない場合(初期状態)は
    //form送信ボタンを押せるフラグをfalseにする。
    $(".form-control").each((index, element) => {
      if ($(element).val() === "") {
        submitBtnflag = false;
        return false; //jquery each break
      }
    });

    // 警告が出てる場合はform送信ボタンを押せるフラグをfalseにする。
    $(".alert.alert-danger").each((index, element) => {
      if ($(element).css("display") === "block") {
        submitBtnflag = false;
        return false;
      }
    });

    // フラグに応じてform送信ボタンの有効・無効切り替え。
    if (submitBtnflag) $("#btn").prop("disabled", false);
    else $("#btn").prop("disabled", true);
  });

});