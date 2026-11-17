# MySemester

## Pengurusan kelas dan semester

System Admin menetapkan bilangan semester ketika mencipta kelas. Bilangan itu disimpan pada `Classes.semester_limit`, menjadi had ketika semester ditambah, dan kelas hanya boleh diaktifkan selepas semua nombor semester daripada 1 hingga had tersebut diwujudkan. Tiada had tetap 15 semester. Kelas sedia ada dimigrasikan secara automatik dengan had sekurang-kurangnya tiga, bilangan rekod semester sedia ada atau nombor semester tertinggi—yang mana lebih besar.

Dalam Pengurusan Kelas, borang cipta kelas berada di panel boleh buka/tutup; semester, akses/peranan dan direktori pensyarah diurus dalam bahagian boleh sorok mengikut kelas. Gunakan carian senarai kelas untuk menapis nama, kod, program atau kohort.

## Akaun pembangunan dan simulasi peranan

Akaun development yang boleh log masuk ialah `devadmin`; rekod demo pelajar, PIC, KO dan pensyarah ialah identiti simulasi dalam Makmal Peranan, bukan akaun dengan kata laluan berasingan. Untuk menetapkan kata laluan dev, simpan sementara `DEV_LOGIN_PASSWORD` (minimum 12 aksara) dalam Apps Script Script Properties, jalankan `hashDevelopmentPasswordProperty()`, kemudian log masuk sebagai `devadmin`. Helper menyimpan hash dan memadam nilai plaintext. Gunakan Makmal Peranan untuk menguji akaun demo.

## Aliran pensyarah, tawaran subjek dan pilihan pelajar

1. System Admin mendaftarkan nama dan emel Google pensyarah dalam Pengurusan Kelas. Akaun Google yang aktif dipautkan serta-merta; jika belum pernah log masuk, ia kekal berstatus `pending` sehingga pemilik emel yang disahkan log masuk. Tiada emel jemputan dihantar oleh sistem.
2. KO, Class Admin atau pensyarah mencipta tawaran subjek untuk semester. Tawaran merangkumi subjek katalog (atau subjek baharu), nama kumpulan, pensyarah dan PIC. Pensyarah hanya boleh mencipta tawaran untuk dirinya sendiri; server menguatkuasakan skop kelas dan peranan.
3. Pensyarah/pegawai yang diberi kebenaran menambah sesi jadual kepada tawaran tersebut. Tawaran hanya boleh dipilih pelajar selepas pensyarah dan PIC aktif ditetapkan serta jadual aktif tersedia.
4. Setiap pelajar memilih satu tawaran bagi setiap subjek. Pilihan disimpan berasingan bagi setiap pelajar dan tidak mengubah jadual rakan sekelas. Jadual, PB, sumber dan acara subjek pelajar ditapis kepada tawaran yang dipilih; acara umum kelas kekal kelihatan.

`LecturerDirectory` menyimpan pra-pendaftaran pensyarah berkelas. `SemesterSubjects` mewakili tawaran semester-subjek yang boleh mempunyai berbilang kumpulan/pensyarah, dengan `offering_name`, `lecturer_user_id` dan `pic_user_id`. `StudentSemesterSubjects` menyimpan pilihan individu menggunakan kunci logik pelajar + semester + subjek. Apps Script menambah helaian dan kolum yang diperlukan secara idempotent apabila API digunakan.

## Hubungan data kanonik

Laluan kanonik ialah `Classes.class_id` → `Semesters.class_id` → `SemesterSubjects.semester_id` → `Subjects.subject_id`. Tawaran subjek merujuk `Users.user_id` bagi pensyarah dan PIC; kedua-duanya mesti ahli aktif kelas dengan peranan yang sepadan. Pelajar memilih `semester_subject_id` melalui `StudentSemesterSubjects`; sesi jadual, PB, sumber dan acara subjek terus merujuk tawaran yang sama.

Jangan tambah jadual pemetaan kelas-subjek kedua atau salin `class_id` ke `SemesterSubjects`; semester menentukan kelas dan mengelakkan pemetaan yang bercanggah. Helaian `DataModel` menerangkan kunci dan peraturan integriti. Pelajar hanya menerima PB terbitan; bahan PB menggunakan pautan `AssignmentResources`.

PB, sumber pembelajaran dan acara kalendar dikumpulkan mengikut subjek dalam panel boleh sorok yang tertutup secara lalai, dengan carian dan penapis ringkas. PIC dan pensyarah dihadkan kepada pemetaan yang ditugaskan kepada mereka.

Muat naik [MySemester_DB.xlsx](./MySemester_DB.xlsx) ke Google Drive dan tetapkan ID spreadsheet dalam Script Properties sebelum deploy Apps Script. Aliran OAuth sebenar serta perubahan Google Sheets perlu disahkan selepas deployment.
