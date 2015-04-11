define(function () {
    "use strict";
    return {
        regexp: {
            "email":    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            "password": /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzL2FwcC9jb25maWdzL2NvbnN0YW50cy5jb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4ge1xuICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgIFwiZW1haWxcIjogICAgL14oKFtePD4oKVtcXF1cXFxcLiw7Olxcc0BcXFwiXSsoXFwuW148PigpW1xcXVxcXFwuLDs6XFxzQFxcXCJdKykqKXwoXFxcIi4rXFxcIikpQCgoXFxbWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcXSl8KChbYS16QS1aXFwtMC05XStcXC4pK1thLXpBLVpdezIsfSkpJC8sXG4gICAgICAgICAgICBcInBhc3N3b3JkXCI6IC9eKD89LipcXGQpKD89LipbYS16XSkoPz0uKltBLVpdKS57OCx9JC9cbiAgICAgICAgfVxuICAgIH07XG59KTsiXSwiZmlsZSI6InNjcmlwdHMvYXBwL2NvbmZpZ3MvY29uc3RhbnRzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9