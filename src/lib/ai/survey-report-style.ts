/**
 * Style guide for AI survey reports — matches pastoral presentation format
 * (e.g. Laporan Analisis Survei Partisipasi Lingkungan).
 */
export const SURVEY_REPORT_STYLE_GUIDE = `Tulis laporan analisis survei dalam Markdown (GFM), Bahasa Indonesia, nada orang pertama ("Saya sudah membaca…", "Menurut saya…"), siap dipresentasikan seperti laporan paroki resmi.

Pembukaan (tanpa heading): paragraf yang menyebut jumlah respons, judul survei (formTitle), dan kesan awal singkat mengapa data menarik dibaca.

Kemudian bagian bernomor dengan heading ## (lewati bagian yang tidak relevan karena data tidak ada):

## 1. Gambaran umum data
- Periode pengumpulan (dateRange.from – dateRange.to)
- Tabel: Bagian | Data tersedia (dari coverage)
- Catatan metodologis jika jawaban tampak sangat terstruktur (hitung uniqueOptions pada pertanyaan pilihan)

## 2. Distribusi jawaban skala / partisipasi utama
- Jika ada pertanyaan range/skala: rata-rata, median, modus
- Tabel distribusi: Nilai | Jumlah | Persentase
- Tabel 3 kelompok analitis (rendah / menengah / tinggi) dari segmentAnalysis — jelaskan ini pembagian analitis, bukan dari kuesioner
- Paragraf interpretasi singkat angka

## 3. Kelompok partisipasi rendah (jika segmentAnalysis ada)
- Tabel alasan: Alasan | Jumlah | % kelompok
- Paragraf: hambatan konkret dari data, bukan sekadar "tidak mau ikut"

## 4. Kelompok menengah / belum konsisten (jika relevan)
- Tabel + paragraf interpretasi pastoral

## 5. Kelompok partisipasi tinggi (jika relevan)
- Tabel + pola yang terlihat (keluarga, peran konkret, rasa memiliki)

## 6. Harapan / masukan tingkat lingkungan
- Rangkum pertanyaan pilihan terkait harapan lingkungan
- Tabel: Harapan | Jumlah | Persentase
- Paragraf interpretasi

## 7. Harapan kepada paroki / gereja (jika ada)
- Berapa yang menjawab vs tidak; persentase dari yang menjawab
- Tabel + paragraf interpretasi

## 8. Temuan yang paling penting
- 5–6 poin bernomor (Pertama, Kedua, … atau 1. 2. …) merangkum pola dari seluruh data

## 9. Arah pastoral / rekomendasi tindak lanjut
- Satu pertanyaan pembimbing, lalu 4–6 arah konkret dari data
- Jika segmentAnalysis ada: apakah harapan kelompok aktif vs kurang aktif mirip atau berbeda

## 10. Catatan agar hasil tidak dibaca terlalu jauh
- Batasan survei (response rate tidak diketahui, tidak ada demografi/lingkungan, dll.)
- Satu kalimat penutup merangkum seluruh survei

Aturan penulisan:
- Gunakan HANYA angka dari data JSON; jangan mengarang.
- Persentase format Indonesia (57,6%).
- Tabel pakai pipe GFM dengan baris pemisah.
- Paragraf naratif dengan kalimat utuh; setelah setiap tabel ada penjelasan dalam paragraf.
- Jangan bungkus output dalam code fence.`;
