@isTest
public class RelatedListDataGridControllerTest {
 	static testMethod void testGetReleatedListsMetadata()
    {
		Test.startTest();                
        Test.setMock(HttpCalloutMock.class, new RestAPIMockHttpResponseGenerator());  
        Object[] relatedListsMatadata = RelatedListDataGridController.getReleatedListsMetadata('0010Y000003iFovQAE');
		System.assertEquals(true, relatedListsMatadata.size() > 0);        
        
        Test.stopTest();        
    }
    
    
    static testMethod void testGetReleatedListMetadata()
    {
        Test.startTest();       
        Test.setMock(HttpCalloutMock.class, new RestAPIMockHttpResponseGenerator());        		
             
        Object relatedListsMatadata = RelatedListDataGridController.getReleatedListMetadata('0010Y000003iFovQAE',
                                                                                            'Contacts');
		System.assertEquals(true, relatedListsMatadata != null);        
        
        Test.stopTest();         
    }
    
    static testMethod void testGetReleatedItems()
    {
        Sobject acc = getNewSobject('Account');
        acc.put('Name', 'Test Account');
        insert acc;

        Sobject contact = getNewSobject('Contact');
        contact.put('AccountId', acc.get('Id'));
        contact.put('FirstName', 'Test');
        contact.put('LastName', 'Test');        
        insert contact;
        
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new RestAPIMockHttpResponseGenerator());                              
        Object[] contacts = RelatedListDataGridController.getReleatedItems(acc.Id,
                                                                           'Contact',
                                                                           'AccountId',
                                                                           new List<String>{'Name'},
                                                                           null,
                                                                           null,
                                                                           null);        
		System.assertEquals(true, contacts.size()>0);         
        
        Test.stopTest();
    } 
    
   
    static testMethod void testSaveRelatedListItems()
    {
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new RestAPIMockHttpResponseGenerator());        
        
        Sobject acc = getNewSobject('Account');
        acc.put('Name', 'Test Account');
        insert acc;

        Sobject acc2 = getNewSobject('Account');
        acc2.put('Name', 'Test Account');
        insert acc2;
        
        Sobject contact = getNewSobject('Contact');
        contact.put('AccountId', acc.get('Id'));
        contact.put('FirstName', 'Test');
        contact.put('LastName', 'Test');        
        insert contact;
        
        Object[] contacts = RelatedListDataGridController.getReleatedItems(acc.Id,
                                                                           'Contact',
                                                                           'AccountId',
                                                                           new List<String>{'FirstName'},
                                                                           null,
                                                                           null,
                                                                           null);                
		
        Map<String, Object> mContact = (Map<String, Object>)contacts.get(0);        
        mContact.put('AccountId', acc2.Id);                
        contact.put('FirstName', 'Test2');
        
		Boolean result = RelatedListDataGridController.saveRelatedListItems(System.JSON.serialize(contacts));
        System.assertEquals(true, result);
        
        Object[] candidates = RelatedListDataGridController.getLookupCandidates('Account', 'Test');
        System.assertEquals(true, candidates.size() > 0);
        
        Test.stopTest();        
    }
    
    public static SObject getNewSobject(String typeName) {
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe(); 
        
        Schema.SObjectType st = gd.get(typeName);
        System.assert(st != null,'Type provided: "' + typeName + '" doesnt map to an sobject token in this org.');
        
        Sobject s = st.newSobject();        
        return s;
    }    
       
    static testMethod void testDelectObject()
    {
        Test.startTest();
        
        Sobject contact = getNewSobject('Contact');        
        contact.put('FirstName', 'Test');
        contact.put('LastName', 'Test');        
        insert contact;              
        
        boolean result = RelatedListDataGridController.deleteRelatedRecord(contact.Id);
        System.assertEquals(true, result);
        
        Test.stopTest();
    }       
    
    static testMethod void testCreateRelatedObject()
    {
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new RestAPIMockHttpResponseGenerator()); 
        
        Sobject acc = getNewSobject('Account');
        acc.put('Name', 'Test Account');
        insert acc;

        Map<String, String> data = new Map<String, String>();
        data.put('AccountId', acc.id);
        data.put('lastname', 'Test');
        data.put('firstname', 'Test');        
                
        Id IdContact = RelatedListDataGridController.createRelatedObject(acc.Id, 
                                                                         'Contact', 
                                                                         JSON.serialize(data));
        System.assertEquals(true, IdContact != null);
        
        Test.stopTest();
    }
    
    static testMethod void testGetFieldSetMetadata()
    {
        Test.startTest();
        
        FieldSetUtils.setMock( new List<SObjectField> { Opportunity.Amount, Opportunity.Name }, 
                              'Opportunity_FieldSet', 
                              'Opportunity FieldSet');
        
        Map<String, Object> mRelatedListMetadata = 
            (Map<String, Object>)RelatedListDataGridController.getFieldSetMetadata('Opportunity', 
                                                                                   'OneDesk__Opportunity_FieldSet');
        
        System.assert(mRelatedListMetadata != null);
        
        Test.stopTest();
    }
    
    static testMethod void testGetFieldSetItems()
    {
        Test.startTest();
        
        Sobject acc = getNewSobject('Account');
        acc.put('Name', 'Test Account');
        insert acc;
        
        Sobject opp = getNewSobject('Opportunity');
        opp.put('Name', 'Test Opportunity');
        opp.put('StageName', 'Sourcing Demand');
        opp.put('CloseDate', System.today());
        opp.put('AccountId', acc.Id);
        insert opp;        

        FieldSetUtils.setMock( new List<SObjectField> { Opportunity.Amount, Opportunity.Name }, 
                              'Opportunity_FieldSet', 
                              'Opportunity FieldSet');
        
        List<Object> opportunityList = 
            RelatedListDataGridController.getFieldSetItems('Opportunity', 
                                                           'OneDesk__Opportunity_FieldSet',
                                                           null,
                                                           null,
                                                           null);
        
        System.assert(opportunityList != null);
        
        Test.stopTest();
    }
}