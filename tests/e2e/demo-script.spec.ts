import { expect, test, type Page } from "@playwright/test";
import { SCENARIO_BANK } from "../../src/modules/experience/bank";

/**
 * Guion de demo completo (Definition of Done):
 * docente ve la dificultad → entiende la evidencia → genera y lanza la experiencia →
 * la estudiante la completa → cambia su estado y su próximo paso → el aula simulada participa →
 * la docente ve el efecto agregado.
 */

async function loginAs(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click();
}

/** El player no expone las claves: la prueba busca la opción correcta en el banco curado por texto. */
async function answerCorrectly(page: Page) {
  const situation = (await page.locator("article p.leading-relaxed").first().innerText()).trim();
  const scenario = SCENARIO_BANK.find((s) => s.situation.trim() === situation);
  expect(scenario, `escenario del banco para: ${situation.slice(0, 60)}`).toBeTruthy();
  const correct = scenario!.options.find((o) => o.correct)!;
  await page.locator("label", { hasText: correct.text }).click();
  await page.getByRole("button", { name: "Confirmar decisión" }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

test("guion de demo: del hallazgo a la nueva evidencia y de vuelta al aula", async ({ browser, request }) => {
  const reset = await request.post("/api/v1/demo/reset", { maxRedirects: 0, timeout: 180_000 });
  expect(reset.status()).toBe(303);

  // 1–4. Docente: dificultad realista, evidencia y recomendación.
  const teacher = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await teacher.goto("/entrar");
  await loginAs(teacher, /Ana Torres/);
  await teacher.waitForURL("**/docente");
  await teacher.getByRole("link", { name: /Innovación de Procesos/ }).first().click();
  await teacher.waitForURL(/\/docente\/c\/[^/]+$/);
  const sectionUrl = teacher.url();
  await expect(teacher.getByText("44% necesita revisar Product Owner vs. Scrum Master")).toBeVisible();

  await teacher.getByRole("link", { name: /Por qué Educai detectó esto/ }).first().click();
  await teacher.waitForURL("**/hallazgos/**");
  await expect(teacher.getByText(/27 estudiantes con evidencia suficiente/).first()).toBeVisible();

  // 5. Generar y lanzar la experiencia.
  await teacher.getByRole("button", { name: /Generar experiencia/ }).click();
  await teacher.waitForURL("**/experiencias/**");
  await teacher.getByRole("button", { name: /Usar experiencia y lanzar/ }).click();
  await teacher.waitForURL("**/lanzamientos/**");
  const code = (await teacher.locator("p.font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{4,8}$/);

  // 6. Estudiante: entra por el código, ve la actividad y la completa.
  const student = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await student.goto(`/x/${code}`);
  await loginAs(student, /Lucía Fernández/);
  await student.waitForURL("**/estudiante/experiencias/**");
  await student.getByRole("button", { name: "Empezar" }).click();
  for (let i = 0; i < 8; i++) {
    await answerCorrectly(student);
    const next = student.getByRole("button", { name: /Siguiente situación/ });
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    await student.getByRole("button", { name: /Ver qué aprendimos/ }).click();
    break;
  }

  // 7. Nueva evidencia → cambia la interpretación → cambia la recomendación.
  await expect(student.getByText("Terminaste")).toBeVisible();
  await expect(student.getByText("Resolviste bien 5 de 5 situaciones.", { exact: true })).toBeVisible();
  const transition = student.locator("div.rounded-2xl", { hasText: "Product Owner vs. Scrum Master" }).first();
  await expect(transition.getByText("Conviene revisar")).toBeVisible();
  await expect(transition.getByText("Evidencia sólida")).toBeVisible();
  await expect(student.getByRole("heading", { name: /Quién hace qué durante el Sprint/ })).toBeVisible();

  await student.goto("/estudiante");
  await expect(student.getByText(/Quién hace qué durante el Sprint/).first()).toBeVisible();
  await expect(student.getByText("Aclará Product Owner vs. Scrum Master")).toHaveCount(0);

  // 8. Docente: el aula participa (modo demo) y se ve el efecto agregado.
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/simulate") && r.ok(), { timeout: 180_000 }),
    teacher.getByRole("button", { name: /Simular participación del aula/ }).click(),
  ]);
  await teacher.getByRole("button", { name: /Cerrar y ver qué observamos/ }).click();
  await expect(teacher.getByText("Qué observamos", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(teacher.getByText("44%", { exact: true })).toBeVisible();
  await expect(teacher.getByText("24%", { exact: true })).toBeVisible();
  await expect(teacher.getByText(/Se observó una mejora/)).toBeVisible();

  await teacher.goto(sectionUrl);
  await expect(teacher.getByText("Qué cambió con la última experiencia")).toBeVisible();
  await expect(teacher.getByText("44% necesita revisar Product Owner vs. Scrum Master")).toHaveCount(0);

  // Privacidad: la vista docente nunca muestra la identidad de la estudiante.
  const body = await teacher.locator("body").innerText();
  expect(body).not.toContain("Lucía");
});
