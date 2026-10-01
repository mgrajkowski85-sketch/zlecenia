// Generator PDF po stronie przeglądarki.
// Używa biblioteki jsPDF ładowanej w wyceny.html.
function pdfWycena(q){
  if(!window.jspdf){alert("Generator PDF jeszcze się ładuje. Spróbuj ponownie.");return}
  const {jsPDF}=window.jspdf,doc=new jsPDF();
  const pad=18;
  const nr="WYC-"+new Date(q.id).toISOString().slice(0,10).replaceAll("-","")+"-"+String(q.id).slice(-4);
  doc.setFontSize(22);doc.text("WYCENA",pad,22);
  doc.setFontSize(10);doc.text(nr,pad,29);doc.text(q.date,pad,35);
  doc.setFontSize(13);doc.text("Klient:",pad,50);
  doc.setFontSize(11);doc.text(String(q.client||""),pad,57);
  let y=72;
  doc.setFontSize(10);doc.text("Lp.",pad,y);doc.text("Usługa / materiał",pad+12,y);doc.text("Ilość",130,y);doc.text("Cena",150,y);doc.text("Wartość",178,y);
  y+=6;doc.line(pad,y,192,y);y+=7;
  q.items.forEach((x,i)=>{
    if(y>270){doc.addPage();y=20}
    const value=Number(x.qty||0)*Number(x.price||0);
    doc.text(String(i+1),pad,y);
    doc.text(String(x.name||"").slice(0,52),pad+12,y);
    doc.text(String(x.qty||0),130,y);
    doc.text(Number(x.price||0).toFixed(2)+" zł",150,y);
    doc.text(value.toFixed(2)+" zł",178,y);
    y+=7;
  });
  y+=5;doc.line(120,y,192,y);y+=9;
  doc.setFontSize(15);doc.text("RAZEM: "+Number(q.total||0).toFixed(2)+" zł",135,y);
  if(q.note){y+=14;doc.setFontSize(10);doc.text("Uwagi:",pad,y);y+=6;doc.text(String(q.note).slice(0,100),pad,y)}
  y=282;doc.setFontSize(8);doc.text("Wycena — dokument informacyjny",pad,y);
  return doc;
}
function pobierzPdfWyceny(q){
  const doc=pdfWycena(q); if(!doc)return;
  doc.save("wycena-"+q.client.replace(/[^a-z0-9ąćęłńóśźż]+/gi,"-")+"-"+q.date+".pdf");
}
function udostepnijPdfWyceny(q){
  const doc=pdfWycena(q); if(!doc)return;
  const blob=doc.output("blob"),file=new File([blob],"wycena-"+q.date+".pdf",{type:"application/pdf"});
  if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({title:"Wycena",text:"Wycena dla "+q.client,files:[file]});
  }else pobierzPdfWyceny(q);
}