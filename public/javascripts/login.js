$(() => {

  //入力間違いがある場合。
  //前に入力されたidがformにあり、localStorageにはid/passwordのペアがある。
  //formのidからlocalStorageのペアを消去。
  if ($(".alert.alert-danger").css("display") === "block") {
    localStorage.removeItem($("#user-id").val());
  }

  //パスワードの表示・非表示。
  $(document).on("change", "#password-display-switch", () => {
    if ($("#password-display-switch").prop("checked")) {
      //表示。
      $("#password").attr("type", "text");
      $("#password-for-confirm").attr("type", "text");
    } else {
      //非表示。
      $("#password").attr("type", "password");
      $("#password-for-confirm").attr("type", "password");
    }
  });

  //formの内容が変更されるたびに、すべて入力されているかを確認。
  $(document).on("change", ".form-control", () => {
    let submitBtnflag = true;

    //ひとつでも入力されていなければフラグをfalseにする。
    $(".form-control").each((index, element) => {
      if ($(element).val() === "") {
        submitBtnflag = false;
        return false; //jquery each break
      }
    })

    //フラグに応じてform送信ボタンの有効・無効を切り替え。
    if (submitBtnflag) $("#btn").prop("disabled", false);
    else $("#btn").prop("disabled", true);
  })

  //formの送信ボタンが押されたら、localStorageにid/passwordのペアを保存。
  $(document).on("click", "#btn", () => {
    localStorage.setItem($("#user-id").val(), $("#password").val());
  })

})