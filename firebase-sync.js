import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAd5AVGAobuv4qcfNrPZ1Dw1spiZPZ6KMQ",
  authDomain: "calendario-operativo-esmoris.firebaseapp.com",
  projectId: "calendario-operativo-esmoris",
  storageBucket: "calendario-operativo-esmoris.firebasestorage.app",
  messagingSenderId: "460442465898",
  appId: "1:460442465898:web:d7ed1b94361b9b5f3cfc13"
};

const EMAIL_AUTORIZADO = "esmorispiletas@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});

let unsubscribe = null;

function aviso(texto) {
  const el = document.querySelector("#syncNotice");
  if (el) el.textContent = texto;
}

function actualizarCalendario(lista) {
  localStorage.setItem("esmoris_jobs", JSON.stringify(lista));

  window.dispatchEvent(
    new CustomEvent("esmoris-cloud-jobs", {
      detail: lista
    })
  );
}

function iniciarSincronizacion() {
  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(
    collection(db, "jobs"),

    snapshot => {
      const lista = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
      }));

      actualizarCalendario(lista);

      aviso(
        `☁️ Sincronizado · ${lista.length} trabajo${
          lista.length === 1 ? "" : "s"
        }`
      );
    },

    error => {
      console.error(error);

      aviso(
        "⚠️ No se pudo sincronizar con Firestore."
      );
    }
  );
}

window.EsmorisCloud = {

  estaConectado() {
    const usuario = auth.currentUser;

    return (
      usuario &&
      usuario.email &&
      usuario.email.toLowerCase() === EMAIL_AUTORIZADO
    );
  },

  async guardarTrabajo(trabajo) {

    if (!this.estaConectado()) {
      throw new Error("Usuario no autorizado");
    }

    await setDoc(
      doc(db, "jobs", trabajo.id),
      trabajo
    );
  },

  async eliminarTrabajo(id) {

    if (!this.estaConectado()) {
      throw new Error("Usuario no autorizado");
    }

    await deleteDoc(
      doc(db, "jobs", id)
    );
  }
};

const botonLogin =
  document.querySelector("#loginBtn");

const botonLogout =
  document.querySelector("#logoutBtn");

if (botonLogin) {

  botonLogin.addEventListener(
    "click",

    async () => {

      try {

        await signInWithPopup(
          auth,
          provider
        );

      } catch (error) {

        console.error(error);

        if (
          error.code !==
          "auth/popup-closed-by-user"
        ) {

          alert(
            "No se pudo iniciar sesión con Google."
          );

        }
      }
    }
  );
}

if (botonLogout) {

  botonLogout.addEventListener(
    "click",

    async () => {

      await signOut(auth);

    }
  );
}

onAuthStateChanged(
  auth,

  async usuario => {

    if (!usuario) {

      botonLogin?.classList.remove("hidden");
      botonLogout?.classList.add("hidden");

      aviso(
        "🔐 Iniciá sesión con Google para sincronizar la programación."
      );

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      return;
    }

    if (
      usuario.email.toLowerCase() !==
      EMAIL_AUTORIZADO
    ) {

      alert(
        `Esta aplicación está habilitada únicamente para ${EMAIL_AUTORIZADO}.`
      );

      await signOut(auth);

      return;
    }

    botonLogin?.classList.add("hidden");
    botonLogout?.classList.remove("hidden");

    aviso(
      `☁️ Conectando como ${usuario.email}...`
    );

    iniciarSincronizacion();
  }
);
