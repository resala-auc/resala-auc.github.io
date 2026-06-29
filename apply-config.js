import { roleGuides } from "./role-guide-data.mjs";

                    
               
                   
                
                    
        
                    
            
                           
                           

                          
             
               
                    
                      
                    
                       
                                
                               
                              
                                 
                          
                     
  

                                  
                    
                   
                   
                    
                
                    
                
                         
                        
                          
                           
                      
                            
                      
                                   
                        
                          
                             
                    
  

                                     
                          
                   
                    
                                  
                                   
                    
                      
  

                                         
                  
               
  

                                   
             
                
               
                    
                  
                        
                      
                   
                  
                        
                    
                
                           
                    
  

                                                  

                                                     
                                        
                                                              
  

const runtimeConfig = globalThis                            ;

export const APPLICATION_ENDPOINT = runtimeConfig.RESALA_APPLICATIONS_ENDPOINT?.trim() ?? "";
export const APPLICATION_ENDPOINT_MODE                          =
  runtimeConfig.RESALA_APPLICATIONS_ENDPOINT_MODE === "no-cors" ? "no-cors" : "cors";

export const roles               = roleGuides.map((role) => ({
  id: role.id          ,
  name: role.name,
  stepTitle: role.stepTitle,
  description: role.shortDescription,
  whyChoose: role.whyChoose,
  actualWork: role.actualWork,
  leadershipRequirement: role.leadershipRequirement,
  ownershipRequirement: role.ownershipRequirement,
  skillsRequirement: role.skillsRequirement,
  preferredExperiences: role.preferredExperiences,
  guidingQuestion: role.guidingQuestion,
  taskPrompt: role.taskPrompt
}));

export const yearLevelOptions = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"]         ;

export async function fetchInterviewSlots()                                 {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, { method: "GET", mode: APPLICATION_ENDPOINT_MODE });
  const body = await response.json();

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || "Could not load interview slots.");
  }

  return Array.isArray(body?.slots) ? (body.slots                         ) : [];
}

export function createConfirmationEmailTemplate(payload                    )                            {
  const selectedRole = roles.find((role) => role.name === payload.roleAppliedFor);
  const roleLine = selectedRole?.taskPrompt ?? "One practical idea for how you would help the team move the work forward.";

  return {
    subject: `Resala AUC: your ${payload.roleAppliedFor} application was received`,
    body: [
      `Hi ${payload.fullName},`,
      "",
      `Thanks for applying to Resala AUC. Your first preference is ${payload.roleAppliedFor}, and your second preference is ${payload.secondPreference}.`,
      "",
      `Your interview slot is: ${payload.interviewSlotLabel || payload.interviewSlot}.`,
      "",
      "Please prepare one simple idea for the role:",
      "",
      `- ${roleLine}`,
      "",
      "Keep it simple. We are not looking for a polished pitch.",
      "If anything feels unclear, just reply to this email and we will help.",
      "",
      "Best,",
      "Resala AUC"
    ].join("\n")
  };
}

export async function submitApplication(data                    )                        {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, {
    method: "POST",
    mode: APPLICATION_ENDPOINT_MODE,
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      ...data
    })
  });

  if (response.type === "opaque") {
    return { ok: true };
  }

  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : null;

  if (!response.ok || responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Application database rejected the submission.");
  }

  return { ok: true };
}

export async function submitTasks(data                       )                        {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, {
    method: "POST",
    mode: APPLICATION_ENDPOINT_MODE,
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      ...data
    })
  });

  if (response.type === "opaque") {
    return { ok: true };
  }

  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : null;

  if (!response.ok || responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Application database rejected the task submission.");
  }

  return { ok: true };
}
