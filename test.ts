async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ' FLORENCE@gmail.com ', password: 'Password123!' })
  });
  console.log(res.status);
  console.log(await res.json());
}
test();
