import { useRef, useState } from "react";
import {
  FiAlignLeft,
  FiArrowDown,
  FiArrowUp,
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiEdit3,
  FiImage,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiTag,
  FiTrash2,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import { DEFAULT_SITE_CONTENT } from "./defaultSiteContent";
import { useSiteContent } from "./useSiteContent";

const clone = (value) => JSON.parse(JSON.stringify(value));
const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SECTIONS = [
  ["general", "Contenido general"],
  ["recommendations", "Platos recomendados"],
  ["chefs", "Nuestros chefs"],
  ["happyHour", "Happy Hour"],
];

const SECTION_TITLES = Object.fromEntries(SECTIONS);

const TextField = ({ label, value, onChange, multiline = false, hint = "", Icon }) => {
  const Control = multiline ? "textarea" : "input";
  return (
    <label className="site-content-field">
      <span className="site-content-field__label">{Icon && <Icon aria-hidden="true" />}{label}</span>
      <Control value={value} onChange={(event) => onChange(event.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  );
};

const ImageField = ({ label, value, onChange, recommendation, ratio }) => {
  const inputRef = useRef(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);

  const loadFile = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setFileError("Usa una imagen JPG, PNG, WebP o GIF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("La imagen debe pesar 2 MB o menos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setFileError("No se pudo leer el archivo seleccionado.");
        return;
      }
      onChange(reader.result);
      setFileError("");
    };
    reader.onerror = () => setFileError("No se pudo leer el archivo seleccionado.");
    reader.readAsDataURL(file);
  };

  const readFile = (event) => {
    loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  return (
    <div className="site-content-image-field">
      <label
        className={`site-content-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          loadFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={readFile}
          aria-label={`Subir ${label.toLowerCase()}`}
        />
        <span className="site-content-dropzone__icon">
          <FiImage aria-hidden="true" />
          <FiUploadCloud aria-hidden="true" />
        </span>
        <span>Haz clic o arrastra una imagen</span>
      </label>
      <span className="site-content-dimension">{recommendation}</span>
      {fileError && <p className="site-content-error" role="alert">{fileError}</p>}
      {value && (
        <div className={`site-content-preview site-content-preview--${ratio}`}>
          <img src={value} alt={`Vista previa: ${label}`} />
        </div>
      )}
      <details className="site-content-url">
        <summary>O pega una URL</summary>
        <TextField
          label="URL de imagen"
          value={value.startsWith("data:image/") ? "" : value}
          onChange={(next) => { onChange(next); setFileError(""); }}
        />
      </details>
    </div>
  );
};

const ItemActions = ({ index, count, label, onMove, onRemove, minimum = 1 }) => (
  <div className="site-content-item-actions">
    <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Subir ${label}`} title="Subir">
      <FiArrowUp aria-hidden="true" /><span>Subir</span>
    </button>
    <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Bajar ${label}`} title="Bajar">
      <FiArrowDown aria-hidden="true" /><span>Bajar</span>
    </button>
    <button type="button" onClick={onRemove} disabled={count <= minimum} aria-label={`Eliminar ${label}`} title="Eliminar">
      <FiTrash2 aria-hidden="true" /><span>Eliminar</span>
    </button>
  </div>
);

const SiteContentEditor = ({ activeSection, hidden = false }) => {
  const { content, status, error, saveContent } = useSiteContent();
  const [draftState, setDraftState] = useState(() => clone(content));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const draft = dirty ? draftState : content;

  const edit = (update) => {
    setDraftState((current) => update(clone(current)));
    setDirty(true);
    setSaved(false);
    setSaveError("");
  };

  const updateGeneral = (key, value) => edit((next) => {
    next.general[key] = value;
    return next;
  });

  const updateDish = (id, key, value) => edit((next) => {
    next.recommendations.dishes = next.recommendations.dishes.map((dish) => (
      dish.id === id ? { ...dish, [key]: value } : dish
    ));
    return next;
  });

  const updateChef = (id, key, value) => edit((next) => {
    next.chefs.people = next.chefs.people.map((chef) => (
      chef.id === id ? { ...chef, [key]: value } : chef
    ));
    return next;
  });

  const updateSlide = (id, key, value) => edit((next) => {
    next.happyHour.slides = next.happyHour.slides.map((slide) => (
      slide.id === id ? { ...slide, [key]: value } : slide
    ));
    return next;
  });

  const moveDish = (index, direction) => edit((next) => {
    const target = index + direction;
    if (target >= 0 && target < next.recommendations.dishes.length) {
      [next.recommendations.dishes[index], next.recommendations.dishes[target]] =
        [next.recommendations.dishes[target], next.recommendations.dishes[index]];
    }
    return next;
  });

  const moveChef = (index, direction) => edit((next) => {
    const target = index + direction;
    if (target >= 0 && target < next.chefs.people.length) {
      [next.chefs.people[index], next.chefs.people[target]] =
        [next.chefs.people[target], next.chefs.people[index]];
    }
    return next;
  });

  const save = async (nextContent = draft) => {
    setSaving(true);
    setSaveError("");
    try {
      await saveContent(nextContent);
      setDraftState(clone(nextContent));
      setDirty(false);
      setSaved(true);
    } catch (saveFailure) {
      setSaveError(saveFailure.message || "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDirty(false);
    setSaved(false);
    setSaveError("");
  };

  const restoreDefaults = async () => {
    if (!window.confirm("Esto reemplazará todo el contenido guardado por los valores originales. ¿Continuar?")) return;
    const defaults = clone(DEFAULT_SITE_CONTENT);
    await save(defaults);
  };

  const addDish = () => edit((next) => {
    next.recommendations.dishes.push({
      id: newId("dish"),
      name: "",
      description: "",
      price: "",
      promotion: "",
      image: "",
    });
    return next;
  });

  const addChef = () => edit((next) => {
    next.chefs.people.push({ id: newId("chef"), name: "", specialty: "", bio: "", image: "" });
    return next;
  });

  const addSlide = () => edit((next) => {
    const previous = next.happyHour.slides.at(-1);
    next.happyHour.slides.push({
      ...clone(previous),
      id: newId("happy"),
      offers: previous.offers.map((offer) => ({ ...offer })),
    });
    return next;
  });

  const moveSlide = (index, direction) => edit((next) => {
    const target = index + direction;
    if (target < 0 || target >= next.happyHour.slides.length) return next;
    [next.happyHour.slides[index], next.happyHour.slides[target]] =
      [next.happyHour.slides[target], next.happyHour.slides[index]];
    return next;
  });

  const general = draft.general;

  return (
    <section className="site-content-editor" aria-label="Editor de contenido" hidden={hidden}>
      <header className="site-content-header">
        <h1>{SECTION_TITLES[activeSection]}</h1>
        <div className="site-content-header__actions">
          <button type="button" className="site-content-save" onClick={() => save()} disabled={saving || status !== "ready"}>
            <FiSave aria-hidden="true" />{saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" className="site-content-header__quiet" onClick={cancel} disabled={!dirty || saving}>Cancelar</button>
          <button
            type="button"
            className="site-content-header__quiet site-content-header__reset"
            onClick={restoreDefaults}
            disabled={saving || status !== "ready"}
            aria-label="Restaurar valores por defecto"
            title="Restaurar valores por defecto"
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      {status === "loading" && <p className="site-content-notice">Cargando contenido guardado…</p>}
      {status === "error" && (
        <p className="site-content-error" role="alert">
          {error} Para guardar desde esta computadora, abre el administrador en localhost.
        </p>
      )}
      {saveError && <p className="site-content-error" role="alert">{saveError}</p>}
      {saved && <p className="site-content-success" role="status">Cambios guardados y publicados.</p>}

      {activeSection === "general" && (
        <div className="site-content-form site-content-form--general">
          <section className="site-content-card">
            <h2>Portada</h2>
            <TextField label="Título principal" value={general.heroTitle} onChange={(value) => updateGeneral("heroTitle", value)} multiline hint="Usa una nueva línea para separar renglones." />
            <TextField label="Subtítulo" value={general.heroSubtitle} onChange={(value) => updateGeneral("heroSubtitle", value)} Icon={FiEdit3} />
            <TextField label="Aviso o campaña" value={general.heroNotice} onChange={(value) => updateGeneral("heroNotice", value)} hint="Opcional; aparece debajo del subtítulo." Icon={FiTag} />
            <ImageField label="Imagen de portada (opcional)" value={general.heroImage} onChange={(value) => updateGeneral("heroImage", value)} recommendation="Dimensión recomendada: 1920×1080 px (panorámica 16:9)." ratio="wide" />
          </section>
          <section className="site-content-card">
            <h2>Nuestra esencia</h2>
            <ImageField label="Fotografía" value={general.aboutImage} onChange={(value) => updateGeneral("aboutImage", value)} recommendation="Dimensión recomendada: 1200×900 px (formato 4:3)." ratio="landscape" />
            <TextField label="Antetítulo" value={general.aboutKicker} onChange={(value) => updateGeneral("aboutKicker", value)} Icon={FiTag} />
            <TextField label="Título, primera línea" value={general.aboutTitleFirst} onChange={(value) => updateGeneral("aboutTitleFirst", value)} Icon={FiEdit3} />
            <TextField label="Título, segunda línea" value={general.aboutTitleSecond} onChange={(value) => updateGeneral("aboutTitleSecond", value)} Icon={FiEdit3} />
            <TextField label="Descripción" value={general.aboutDescription} onChange={(value) => updateGeneral("aboutDescription", value)} multiline Icon={FiAlignLeft} />
            <TextField label="Texto complementario" value={general.aboutFollowup} onChange={(value) => updateGeneral("aboutFollowup", value)} multiline Icon={FiAlignLeft} />
          </section>
          <section className="site-content-card">
            <h2>Sedes y horarios</h2>
            <TextField label="Antetítulo de sedes" value={general.locationsEyebrow} onChange={(value) => updateGeneral("locationsEyebrow", value)} Icon={FiTag} />
            <TextField label="Título de sedes" value={general.locationsTitle} onChange={(value) => updateGeneral("locationsTitle", value)} Icon={FiEdit3} />
            <TextField label="Días de atención" value={general.openingDays} onChange={(value) => updateGeneral("openingDays", value)} Icon={FiClock} />
            <TextField label="Horario de atención" value={general.openingHours} onChange={(value) => updateGeneral("openingHours", value)} Icon={FiClock} />
            <TextField label="Horario del pie de página" value={general.footerSchedule} onChange={(value) => updateGeneral("footerSchedule", value)} Icon={FiClock} />
          </section>
        </div>
      )}

      {activeSection === "recommendations" && (
        <div className="site-content-form site-content-form--items">
          <section className="site-content-card">
            <h2>Encabezado</h2>
            <TextField label="Antetítulo" value={draft.recommendations.kicker} onChange={(value) => edit((next) => { next.recommendations.kicker = value; return next; })} Icon={FiTag} />
            <TextField label="Título" value={draft.recommendations.title} onChange={(value) => edit((next) => { next.recommendations.title = value; return next; })} Icon={FiEdit3} />
          </section>
          {draft.recommendations.dishes.map((dish, index) => (
            <section className="site-content-card site-content-card--item" key={dish.id}>
              <div className="site-content-card-heading">
                <h2>Plato {index + 1}</h2>
                <ItemActions
                  index={index}
                  count={draft.recommendations.dishes.length}
                  label={`plato ${index + 1}`}
                  onMove={(direction) => moveDish(index, direction)}
                  onRemove={() => edit((next) => { next.recommendations.dishes = next.recommendations.dishes.filter((item) => item.id !== dish.id); return next; })}
                />
              </div>
              <div className="site-content-card__body">
                <ImageField label="Imagen del plato" value={dish.image} onChange={(value) => updateDish(dish.id, "image", value)} recommendation="Dimensión recomendada: 800 × 600 px" ratio="landscape" />
                <div className="site-content-card__fields">
                  <TextField label="Nombre del plato" value={dish.name} onChange={(value) => updateDish(dish.id, "name", value)} Icon={FiEdit3} />
                  <TextField label="Descripción" value={dish.description} onChange={(value) => updateDish(dish.id, "description", value)} multiline Icon={FiAlignLeft} />
                  <TextField label="Precio" value={dish.price} onChange={(value) => updateDish(dish.id, "price", value)} Icon={FiDollarSign} />
                  <TextField label="Etiqueta promocional" value={dish.promotion} onChange={(value) => updateDish(dish.id, "promotion", value)} Icon={FiTag} />
                </div>
              </div>
            </section>
          ))}
          <button type="button" className="site-content-add" onClick={addDish}><FiPlus aria-hidden="true" />Agregar plato</button>
        </div>
      )}

      {activeSection === "chefs" && (
        <div className="site-content-form site-content-form--items">
          <section className="site-content-card">
            <h2>Encabezado</h2>
            <TextField label="Antetítulo" value={draft.chefs.kicker} onChange={(value) => edit((next) => { next.chefs.kicker = value; return next; })} Icon={FiTag} />
            <TextField label="Título" value={draft.chefs.title} onChange={(value) => edit((next) => { next.chefs.title = value; return next; })} Icon={FiEdit3} />
          </section>
          {draft.chefs.people.map((chef, index) => (
            <section className="site-content-card site-content-card--item" key={chef.id}>
              <div className="site-content-card-heading">
                <h2>Chef {index + 1}</h2>
                <ItemActions
                  index={index}
                  count={draft.chefs.people.length}
                  label={`chef ${index + 1}`}
                  onMove={(direction) => moveChef(index, direction)}
                  onRemove={() => edit((next) => { next.chefs.people = next.chefs.people.filter((item) => item.id !== chef.id); return next; })}
                />
              </div>
              <div className="site-content-card__body">
                <ImageField label="Fotografía del chef" value={chef.image} onChange={(value) => updateChef(chef.id, "image", value)} recommendation="Dimensión recomendada: 600 × 600 px" ratio="square" />
                <div className="site-content-card__fields">
                  <TextField label="Nombre" value={chef.name} onChange={(value) => updateChef(chef.id, "name", value)} Icon={FiUser} />
                  <TextField label="Cargo o especialidad" value={chef.specialty} onChange={(value) => updateChef(chef.id, "specialty", value)} Icon={FiBriefcase} />
                  <TextField label="Biografía corta" value={chef.bio} onChange={(value) => updateChef(chef.id, "bio", value)} multiline Icon={FiAlignLeft} />
                </div>
              </div>
            </section>
          ))}
          <button type="button" className="site-content-add" onClick={addChef}><FiPlus aria-hidden="true" />Agregar chef</button>
        </div>
      )}

      {activeSection === "happyHour" && (
        <div className="site-content-form site-content-form--items">
          {draft.happyHour.slides.map((slide, index) => (
            <section className="site-content-card site-content-card--item" key={slide.id}>
              <div className="site-content-card-heading">
                <h2>Diapositiva {index + 1}</h2>
                <ItemActions
                  index={index}
                  count={draft.happyHour.slides.length}
                  minimum={3}
                  label={`diapositiva ${index + 1}`}
                  onMove={(direction) => moveSlide(index, direction)}
                  onRemove={() => edit((next) => { next.happyHour.slides = next.happyHour.slides.filter((item) => item.id !== slide.id); return next; })}
                />
              </div>
              <div className="site-content-card__body">
                <ImageField label="Imagen de la promoción" value={slide.image} onChange={(value) => updateSlide(slide.id, "image", value)} recommendation="Dimensión recomendada: 1200 × 500 px" ratio="banner" />
                <div className="site-content-card__fields">
                  <TextField label="Título de la promoción" value={slide.title} onChange={(value) => updateSlide(slide.id, "title", value)} Icon={FiEdit3} />
                  <TextField label="Palabra destacada" value={slide.emphasis} onChange={(value) => updateSlide(slide.id, "emphasis", value)} Icon={FiTag} />
                  <TextField label="Días o antetítulo" value={slide.kicker} onChange={(value) => updateSlide(slide.id, "kicker", value)} Icon={FiTag} />
                  <TextField label="Descripción" value={slide.description} onChange={(value) => updateSlide(slide.id, "description", value)} multiline Icon={FiAlignLeft} />
                  <TextField label="Horario promocional" value={slide.schedule} onChange={(value) => updateSlide(slide.id, "schedule", value)} Icon={FiClock} />
                  <div className="site-content-offers">
                    <h3>Detalles de la promoción</h3>
                    {slide.offers.map((offer, offerIndex) => (
                      <div className="site-content-offer" key={`${slide.id}-offer-${offerIndex}`}>
                        <TextField label="Precio u oferta" value={offer.price} onChange={(value) => edit((next) => { next.happyHour.slides.find((item) => item.id === slide.id).offers[offerIndex].price = value; return next; })} Icon={FiDollarSign} />
                        <TextField label="Detalle" value={offer.details} onChange={(value) => edit((next) => { next.happyHour.slides.find((item) => item.id === slide.id).offers[offerIndex].details = value; return next; })} multiline Icon={FiAlignLeft} />
                        <button type="button" className="site-content-offer-remove" onClick={() => edit((next) => { next.happyHour.slides.find((item) => item.id === slide.id).offers.splice(offerIndex, 1); return next; })}>
                          <FiTrash2 aria-hidden="true" />Quitar detalle
                        </button>
                      </div>
                    ))}
                    <button type="button" className="site-content-add" onClick={() => edit((next) => { next.happyHour.slides.find((item) => item.id === slide.id).offers.push({ price: "", details: "" }); return next; })}>
                      <FiPlus aria-hidden="true" />Agregar detalle
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
          <button type="button" className="site-content-add" onClick={addSlide}><FiPlus aria-hidden="true" />Agregar diapositiva</button>
        </div>
      )}
    </section>
  );
};

export default SiteContentEditor;
