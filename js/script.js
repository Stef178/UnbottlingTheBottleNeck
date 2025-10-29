document.querySelectorAll('.step').forEach(step=>{
  step.addEventListener('click',()=>{
    alert(`Je klikte op: ${step.querySelector('p').textContent}`);
  });
});
