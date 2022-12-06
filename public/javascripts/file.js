
$(async () => {
    let fileUrl;

    let json = {
        "password": localStorage.getItem(userID),
        "cid": cid,
    }

    await fetch(`/user/${userID}/decrypt/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json)
    }).then(async (res) => {
        console.log(res)
        const blob = await res.blob();
        console.log(blob)
        const fileUrl = window.URL.createObjectURL(blob);

        await $('.container').append(
            `<iframe src="${fileUrl}"}"></iframe>`
        );
    })

    $('.container iframe').on('load', async () => {
        await $('.container iframe').contents().find('html').css('height', '');
        await $('.container iframe').contents().find('html').css('display', 'block');

        const iframeImg = await $('.container iframe').contents().find('img');
        if (iframeImg.length > 0) {
            console.log(iframeImg)
            await iframeImg.css('display', 'block');
            await iframeImg.css('width', '100%');
        }
        fileUrl.revokeObjectURL();
    })

});