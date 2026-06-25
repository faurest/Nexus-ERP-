import https from 'https';
const getLatest = (repo) => {
  return new Promise((resolve) => {
    https.get(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { "User-Agent": "node" } }, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve(repo + ": " + JSON.parse(data).tag_name); } catch(e) { resolve(repo + ": error"); }
      });
    });
  });
};
Promise.all([
  getLatest("actions/checkout"),
  getLatest("actions/setup-node"),
  getLatest("actions/setup-java"),
  getLatest("android-actions/setup-android")
]).then(res => console.log(res));
